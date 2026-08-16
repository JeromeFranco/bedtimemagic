import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, createAudioPlaylist, setAudioModeAsync } from 'expo-audio';
import { getAmbientAudioSource } from '@/lib/audio-utils';
import { cancelStoryAudio, streamStorySegment } from '@/lib/inworld-tts';
import { splitStoryIntoSegments } from '@/lib/story-segments';
import { createOperationId } from '@/lib/observability';
import type { Story } from '@/types';

export type PostStoryPhase = 'idle' | 'fading' | 'pillow_talk' | 'affirmation' | 'fade_to_black' | 'done';

export interface PlayerContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isBuffering: boolean;
  isSleepMode: boolean;
  playbackError: string | null;
  position: number;
  duration: number;
  postStoryPhase: PostStoryPhase;
  playStory: (story: Story) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  stopStory: () => void;
  toggleSleepMode: () => void;
  showAffirmation: () => void;
  finishWindDown: () => void;
  completeWindDown: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentStory: null,
  isPlaying: false,
  isBuffering: false,
  isSleepMode: false,
  position: 0,
  playbackError: null,
  duration: 0,
  postStoryPhase: 'idle',
  playStory: async () => {},
  pause: () => {},
  resume: () => {},
  seekTo: () => {},
  stopStory: () => {},
  toggleSleepMode: () => {},
  showAffirmation: () => {},
  finishWindDown: () => {},
  completeWindDown: () => {},
});

const FADE_DURATION = 3000;
const FADE_INTERVAL = 50;
const FADE_TO_BLACK_DURATION = 1000;
const AMBIENT_FADE_INTERVAL = 50;
const ESTIMATED_SECONDS_PER_CHAR = 0.07;

function cumulativeStart(durations: number[], index: number): number {
  let total = 0;
  for (let i = 0; i < index; i++) total += durations[i] ?? 0;
  return total;
}

type PendingSeek = {
  segmentIndex: number;
  offset: number;
  resumeOnReady: boolean;
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [postStoryPhase, setPostStoryPhase] = useState<PostStoryPhase>('idle');
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const playlistRef = useRef<ReturnType<typeof createAudioPlaylist> | null>(null);
  const ambientPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStoryRef = useRef<Story | null>(null);
  const playbackGenerationRef = useRef(0);
  const playbackOperationIdRef = useRef<string | null>(null);
  const segmentsRef = useRef<string[]>([]);
  const segmentDurationsRef = useRef<number[]>([]);
  const pendingSeekRef = useRef<PendingSeek | null>(null);
  const manuallyPausedRef = useRef(false);
  const generationUnderrunRef = useRef(false);
  const finalFlowStartedRef = useRef(false);
  const finishingWindDownRef = useRef(false);
  const completedWindDownRef = useRef(false);

  const resetStoryState = useCallback(() => {
    segmentsRef.current = [];
    segmentDurationsRef.current = [];
    pendingSeekRef.current = null;
    manuallyPausedRef.current = false;
    generationUnderrunRef.current = false;
    finalFlowStartedRef.current = false;
    activeStoryRef.current = null;
    playbackOperationIdRef.current = null;
    setCurrentStory(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsSleepMode(false);
    setPosition(0);
    setPlaybackError(null);
    setDuration(0);
  }, []);
  const generateSegmentRef = useRef<(generation: number, segmentIndex: number) => void>(() => {});

  const cleanupAmbient = useCallback(() => {
    if (ambientPlayerRef.current) {
      ambientPlayerRef.current.remove();
      ambientPlayerRef.current = null;
    }
  }, []);

  const cleanupPlaylist = useCallback(() => {
    listenerRef.current?.remove();
    listenerRef.current = null;
    if (playlistRef.current) {
      playlistRef.current.pause();
      playlistRef.current.destroy();
      playlistRef.current = null;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    cleanupAmbient();
  }, [cleanupAmbient]);

  const startAmbient = useCallback(() => {
    cleanupAmbient();
    let ambientPlayer: typeof ambientPlayerRef.current = null;
    try {
      ambientPlayer = createAudioPlayer(getAmbientAudioSource());
      ambientPlayer.volume = 0.15;
      ambientPlayer.loop = true;
      ambientPlayer.play();
      ambientPlayerRef.current = ambientPlayer;
    } catch {
      ambientPlayer?.remove();
      ambientPlayerRef.current = null;
    }
  }, [cleanupAmbient]);

  const finishWindDown = useCallback(() => {
    if (finishingWindDownRef.current) return;
    finishingWindDownRef.current = true;
    setPostStoryPhase('fade_to_black');

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    fadeIntervalRef.current = null;

    const playlist = playlistRef.current;
    const ambient = ambientPlayerRef.current;
    if (!playlist && !ambient) return;

    const playlistStartVolume = playlist?.volume ?? 0;
    const ambientStartVolume = ambient?.volume ?? 0;
    const steps = FADE_TO_BLACK_DURATION / AMBIENT_FADE_INTERVAL;
    let step = 0;
    fadeIntervalRef.current = setInterval(() => {
      step += 1;
      const remaining = Math.max(0, 1 - step / steps);
      if (playlist) playlist.volume = playlistStartVolume * remaining;
      if (ambient) ambient.volume = ambientStartVolume * remaining;
      if (step >= steps) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, AMBIENT_FADE_INTERVAL);
  }, []);

  const completeWindDown = useCallback(() => {
    if (!finishingWindDownRef.current || completedWindDownRef.current) return;
    completedWindDownRef.current = true;
    if (activeStoryRef.current) cancelStoryAudio(activeStoryRef.current.id);
    playbackGenerationRef.current += 1;
    cleanupPlaylist();
    resetStoryState();
    setPostStoryPhase('done');
  }, [cleanupPlaylist, resetStoryState]);

  const startFade = useCallback(() => {
    const playlist = playlistRef.current;
    const hasPrompt = !!activeStoryRef.current?.pillow_talk_prompt;
    const hasAffirmation = !!activeStoryRef.current?.sleepy_affirmation;

    const finishFade = () => {
      listenerRef.current?.remove();
      listenerRef.current = null;
      if (playlistRef.current) {
        playlistRef.current.destroy();
        playlistRef.current = null;
      }
      if (hasPrompt || hasAffirmation) startAmbient();
      if (hasPrompt) {
        setPostStoryPhase('pillow_talk');
      } else if (hasAffirmation) {
        setPostStoryPhase('affirmation');
      } else {
        finishWindDown();
      }
    };

    if (!playlist) {
      finishFade();
      return;
    }

    const startVolume = playlist.volume;
    const steps = FADE_DURATION / FADE_INTERVAL;
    let step = 0;
    fadeIntervalRef.current = setInterval(() => {
      step += 1;
      playlist.volume = Math.max(0, startVolume * (1 - step / steps));
      if (step >= steps) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        finishFade();
      }
    }, FADE_INTERVAL);
  }, [finishWindDown, startAmbient]);

  const attachPlaylistListener = useCallback(
    (generation: number) => {
      const playlist = playlistRef.current;
      if (!playlist) return;

      listenerRef.current = playlist.addListener('playlistStatusUpdate', (status) => {
        if (playbackGenerationRef.current !== generation) return;

        if (status.duration > 0) segmentDurationsRef.current[status.currentIndex] = status.duration;
        setPosition(
          cumulativeStart(segmentDurationsRef.current, status.currentIndex) + status.currentTime,
        );
        setDuration(segmentDurationsRef.current.reduce((total, item) => total + item, 0));

        if (!generationUnderrunRef.current) {
          setIsBuffering(status.isBuffering);
          setIsPlaying(status.playing);
        }

        if (!status.didJustFinish) return;

        if (status.currentIndex < status.trackCount - 1) {
          return;
        }

        if (status.trackCount < segmentsRef.current.length) {
          generationUnderrunRef.current = true;
          setIsPlaying(false);
          setIsBuffering(true);
          return;
        }

        if (finalFlowStartedRef.current) return;
        finalFlowStartedRef.current = true;
        setIsPlaying(false);
        setIsBuffering(false);
        setPostStoryPhase('fading');
        startFade();
      });
    },
    [startFade],
  );

  const generateSegment = useCallback((generation: number, segmentIndex: number) => {
    const story = activeStoryRef.current;
    const text = segmentsRef.current[segmentIndex];
    if (!story || !text) return;

    streamStorySegment(story.id, segmentIndex, text, {
      parentOperationId: playbackOperationIdRef.current ?? undefined,
      segmentCount: segmentsRef.current.length,
    })
      .then((segment) => {
        if (playbackGenerationRef.current !== generation) return;
        setPlaybackError(null);
        const playlist = playlistRef.current;
        if (!playlist || segment.segmentIndex !== playlist.trackCount) return;

        playlist.add({ uri: segment.uri });

        const pendingSeek = pendingSeekRef.current;
        if (pendingSeek && pendingSeek.segmentIndex < playlist.trackCount) {
          pendingSeekRef.current = null;
          if (playlist.currentIndex !== pendingSeek.segmentIndex) {
            playlist.skipTo(pendingSeek.segmentIndex);
          }
          void playlist.seekTo(pendingSeek.offset);
          generationUnderrunRef.current = false;
          setIsBuffering(false);
          if (pendingSeek.resumeOnReady && !manuallyPausedRef.current) {
            playlist.play();
            setIsPlaying(true);
          }
        } else if (
          generationUnderrunRef.current &&
          !manuallyPausedRef.current &&
          playlist.currentIndex < playlist.trackCount - 1
        ) {
          generationUnderrunRef.current = false;
          playlist.next();
          playlist.play();
          setIsBuffering(false);
          setIsPlaying(true);
        }

        const nextIndex = segmentIndex + 1;
        if (nextIndex < segmentsRef.current.length) {
          generateSegmentRef.current(generation, nextIndex);
        }
      })
      .catch(() => {
        if (playbackGenerationRef.current !== generation) return;
        generationUnderrunRef.current = false;
        pendingSeekRef.current = null;
        setIsBuffering(false);
        setIsPlaying(false);
        setPlaybackError('Something went wrong loading the story audio. Tap play to try again.');
      });
  }, []);

  useEffect(() => {
    generateSegmentRef.current = generateSegment;
  }, [generateSegment]);

  const playStory = async (story: Story) => {
    if (activeStoryRef.current) cancelStoryAudio(activeStoryRef.current.id);
    playbackGenerationRef.current += 1;
    const generation = playbackGenerationRef.current;
    playbackOperationIdRef.current = createOperationId();

    cleanupPlaylist();
    activeStoryRef.current = story;
    segmentsRef.current = [];
    segmentDurationsRef.current = [];
    pendingSeekRef.current = null;
    manuallyPausedRef.current = false;
    generationUnderrunRef.current = false;
    finalFlowStartedRef.current = false;
    finishingWindDownRef.current = false;
    completedWindDownRef.current = false;
    setPostStoryPhase('idle');

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    if (playbackGenerationRef.current !== generation) return;

    const segments = splitStoryIntoSegments(story.story_text);
    segmentsRef.current = segments;
    segmentDurationsRef.current = segments.map(
      (segment) => segment.length * ESTIMATED_SECONDS_PER_CHAR,
    );
    setIsBuffering(true);
    setPlaybackError(null);

    let firstSegment;
    try {
      firstSegment = await streamStorySegment(story.id, 0, segments[0], {
        parentOperationId: playbackOperationIdRef.current ?? undefined,
        segmentCount: segments.length,
      });
    } catch {
      if (playbackGenerationRef.current !== generation) return;
      setIsBuffering(false);
      setIsPlaying(false);
      setPlaybackError('Something went wrong loading the story audio. Tap play to try again.');
      return;
    }
    if (playbackGenerationRef.current !== generation) return;

    const playlist = createAudioPlaylist({
      sources: [{ uri: firstSegment.uri }],
      loop: 'none',
      updateInterval: 250,
    });
    playlistRef.current = playlist;
    attachPlaylistListener(generation);

    setCurrentStory(story);
    setIsPlaying(true);
    setIsBuffering(false);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(segmentDurationsRef.current.reduce((total, item) => total + item, 0));
    playlist.play();

    if (segments.length > 1) generateSegmentRef.current(generation, 1);
  };

  const pause = () => {
    manuallyPausedRef.current = true;
    playlistRef.current?.pause();
    setIsPlaying(false);
  };

  const resume = () => {
    manuallyPausedRef.current = false;
    const playlist = playlistRef.current;
    if (!playlist) return;
    if (pendingSeekRef.current) {
      pendingSeekRef.current.resumeOnReady = true;
      setIsBuffering(true);
      setIsPlaying(false);
      return;
    }
    if (generationUnderrunRef.current) {
      if (playlist.currentIndex >= playlist.trackCount - 1) {
        setIsBuffering(true);
        setIsPlaying(false);
        return;
      }
      generationUnderrunRef.current = false;
      playlist.next();
      setIsBuffering(false);
    }
    playlist.play();
    setIsPlaying(true);
  };

  const seekTo = (seconds: number) => {
    const playlist = playlistRef.current;
    const durations = segmentDurationsRef.current;
    if (!playlist || durations.length === 0) return;

    const totalDuration = durations.reduce((total, item) => total + item, 0);
    let offset = Math.max(0, Math.min(seconds, totalDuration));
    let targetIndex = durations.length - 1;
    for (let index = 0; index < durations.length; index++) {
      if (offset < durations[index]) {
        targetIndex = index;
        break;
      }
      offset -= durations[index];
    }

    if (targetIndex < playlist.trackCount) {
      pendingSeekRef.current = null;
      if (targetIndex !== playlist.currentIndex) playlist.skipTo(targetIndex);
      void playlist.seekTo(offset);
      setPosition(cumulativeStart(durations, targetIndex) + offset);
      return;
    }

    const resumeOnReady = !manuallyPausedRef.current && isPlaying;
    pendingSeekRef.current = { segmentIndex: targetIndex, offset, resumeOnReady };
    playlist.pause();
    setIsPlaying(false);
    setIsBuffering(true);
  };

  const showAffirmation = () => {
    if (activeStoryRef.current?.sleepy_affirmation) {
      setPostStoryPhase('affirmation');
      return;
    }
    finishWindDown();
  };

  const stopStory = () => {
    if (activeStoryRef.current) cancelStoryAudio(activeStoryRef.current.id);
    playbackGenerationRef.current += 1;
    cleanupPlaylist();
    resetStoryState();
    setPostStoryPhase('idle');
    finishingWindDownRef.current = false;
    completedWindDownRef.current = false;
  };

  const toggleSleepMode = () => setIsSleepMode((previous) => !previous);


  useEffect(() => {
    return () => {
      if (activeStoryRef.current) cancelStoryAudio(activeStoryRef.current.id);
      playbackGenerationRef.current += 1;
      cleanupPlaylist();
    };
  }, [cleanupPlaylist]);

  return (
    <PlayerContext.Provider
      value={{
        currentStory,
        isPlaying,
        isBuffering,
        isSleepMode,
        playbackError,
        position,
        duration,
        postStoryPhase,
        playStory,
        pause,
        resume,
        seekTo,
        stopStory,
        toggleSleepMode,
        showAffirmation,
        finishWindDown,
        completeWindDown,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
