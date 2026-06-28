import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAudioSource, getAmbientAudioSource, getSampleAudioSource } from '@/lib/audio-utils';
import type { Story } from '@/types';

export type PostStoryPhase = 'idle' | 'fading' | 'pillow_talk' | 'affirmation' | 'done';

interface PlayerContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isBuffering: boolean;
  isSleepMode: boolean;
  position: number;
  duration: number;
  postStoryPhase: PostStoryPhase;
  playStory: (story: Story) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  stopStory: () => void;
  toggleSleepMode: () => void;
  skipPillowTalk: () => void;
  confirmAffirmation: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentStory: null,
  isPlaying: false,
  isBuffering: false,
  isSleepMode: false,
  position: 0,
  duration: 0,
  postStoryPhase: 'idle',
  playStory: async () => {},
  pause: () => {},
  resume: () => {},
  seekTo: () => {},
  stopStory: () => {},
  toggleSleepMode: () => {},
  skipPillowTalk: () => {},
  confirmAffirmation: () => {},
});

const FADE_DURATION = 3000;
const FADE_INTERVAL = 50;

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [postStoryPhase, setPostStoryPhase] = useState<PostStoryPhase>('idle');

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const ambientPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStoryRef = useRef<Story | null>(null);

  const cleanupAmbient = useCallback(() => {
    if (ambientPlayerRef.current) {
      ambientPlayerRef.current.remove();
      ambientPlayerRef.current = null;
    }
  }, []);

  const cleanupPlayer = useCallback(() => {
    if (listenerRef.current) {
      listenerRef.current.remove();
      listenerRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    cleanupAmbient();
  }, [cleanupAmbient]);

  const startAmbient = useCallback(() => {
    cleanupAmbient();
    const source = getAmbientAudioSource();
    const ambientPlayer = createAudioPlayer(source);
    ambientPlayer.volume = 0.15;
    ambientPlayer.loop = true;
    ambientPlayer.play();
    ambientPlayerRef.current = ambientPlayer;
  }, [cleanupAmbient]);

  const startFade = useCallback(() => {
    const player = playerRef.current;
    const hasPrompt = !!activeStoryRef.current?.pillow_talk_prompt;
    const hasAffirmation = !!activeStoryRef.current?.sleepy_affirmation;
    if (!player) {
      if (hasPrompt) {
        startAmbient();
        setPostStoryPhase('pillow_talk');
      } else if (hasAffirmation) {
        setPostStoryPhase('affirmation');
      } else {
        setPostStoryPhase('done');
      }
      return;
    }

    const steps = FADE_DURATION / FADE_INTERVAL;
    let step = 0;

    fadeIntervalRef.current = setInterval(() => {
      step++;
      const volume = Math.max(0, 1 - step / steps);
      player.volume = volume;

      if (step >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        if (playerRef.current) {
          playerRef.current.remove();
          playerRef.current = null;
        }
        if (hasPrompt) {
          startAmbient();
          setPostStoryPhase('pillow_talk');
        } else if (hasAffirmation) {
          setPostStoryPhase('affirmation');
        } else {
          setPostStoryPhase('done');
        }
      }
    }, FADE_INTERVAL);
  }, [startAmbient]);

  const playStory = useCallback(async (story: Story) => {
    cleanupPlayer();
    setPostStoryPhase('idle');
    activeStoryRef.current = story;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    setIsBuffering(true);
    let source: { uri: string };
    try {
      source = await getAudioSource(story);
    } catch {
      source = getSampleAudioSource();
    } finally {
      setIsBuffering(false);
    }
    const player = createAudioPlayer(source);
    playerRef.current = player;

    const listener = player.addListener('playbackStatusUpdate', (status) => {
      setPosition(status.currentTime);
      setDuration(status.duration);
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.playing);

      if (status.didJustFinish) {
        if (listenerRef.current) {
          listenerRef.current.remove();
          listenerRef.current = null;
        }
        setIsPlaying(false);
        setIsBuffering(false);
        setPostStoryPhase('fading');
        startFade();
      }
    });
    listenerRef.current = listener;

    setCurrentStory(story);
    setIsPlaying(true);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(0);
    player.play();
  }, [cleanupPlayer, startFade]);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.play();
    }
    setIsPlaying(true);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds);
    }
  }, []);

  const stopStory = useCallback(() => {
    cleanupPlayer();
    setCurrentStory(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(0);
    setPostStoryPhase('idle');
  }, [cleanupPlayer]);

  const toggleSleepMode = useCallback(() => {
    setIsSleepMode((prev) => !prev);
  }, []);

  const skipPillowTalk = useCallback(() => {
    cleanupAmbient();
    setPostStoryPhase('affirmation');
  }, [cleanupAmbient]);

  const confirmAffirmation = useCallback(() => {
    cleanupPlayer();
    setCurrentStory(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setPosition(0);
    setDuration(0);
    setPostStoryPhase('done');
  }, [cleanupPlayer]);

  useEffect(() => {
    return () => cleanupPlayer();
  }, [cleanupPlayer]);

  return (
    <PlayerContext.Provider
      value={{
        currentStory,
        isPlaying,
        isBuffering,
        isSleepMode,
        position,
        duration,
        postStoryPhase,
        playStory,
        pause,
        resume,
        seekTo,
        stopStory,
        toggleSleepMode,
        skipPillowTalk,
        confirmAffirmation,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
