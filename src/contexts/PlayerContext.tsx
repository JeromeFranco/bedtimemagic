import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAmbientAudioSource } from '@/lib/audio-utils';
import { streamStorySegment } from '@/lib/inworld-tts';
import { splitStoryIntoSegments } from '@/lib/story-segments';
import type { Story } from '@/types';

export type PostStoryPhase = 'idle' | 'fading' | 'pillow_talk' | 'affirmation' | 'fade_to_black' | 'done';

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
  startFadeToBlack: () => void;
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
  startFadeToBlack: () => {},
});

const FADE_DURATION = 3000;
const FADE_INTERVAL = 50;
const FADE_TO_BLACK_DURATION = 4000;
const AMBIENT_FADE_INTERVAL = 50;
const ESTIMATED_SECONDS_PER_CHAR = 0.07;

function cumulativeStart(durations: number[], index: number): number {
  let total = 0;
  for (let i = 0; i < index; i++) {
    total += durations[i] ?? 0;
  }
  return total;
}

type ActiveSegment = {
  index: number;
  uri: string;
};

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
  const playbackGenerationRef = useRef(0);
  const segmentsRef = useRef<string[]>([]);
  const segmentQueueRef = useRef<ActiveSegment[]>([]);
  const nextSegmentIndexRef = useRef(0);
  const failedSegmentsRef = useRef<Set<number>>(new Set());
  const segmentDurationsRef = useRef<number[]>([]);
  const pendingSeekRef = useRef<{ segmentIndex: number; offset: number } | null>(null);
  const attachListenerRef = useRef<(gen: number) => void>(() => {});

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

  const playNextSegmentFromQueueRef = useRef<(gen: number, nextIndex: number) => void>(() => {});

  const playNextSegmentFromQueue = useCallback((gen: number, nextIndex: number) => {
    if (failedSegmentsRef.current.has(nextIndex)) {
      if (pendingSeekRef.current?.segmentIndex === nextIndex) {
        pendingSeekRef.current = null;
      }
      const segments = segmentsRef.current;
      const skipIndex = nextIndex + 1;
      if (skipIndex < segments.length) {
        playNextSegmentFromQueueRef.current(gen, skipIndex);
      } else {
        setIsBuffering(false);
        setIsPlaying(false);
      }
      return;
    }

    const segments = segmentsRef.current;
    const alreadyQueued = segmentQueueRef.current.find(
      (s) => s.index === nextIndex,
    );

    if (alreadyQueued) {
      const player = createAudioPlayer({ uri: alreadyQueued.uri });
      playerRef.current = player;
      segmentQueueRef.current = segmentQueueRef.current.filter(
        (s) => s.index !== nextIndex,
      );
      nextSegmentIndexRef.current = nextIndex + 1;
      setIsBuffering(false);
      setIsPlaying(true);
      attachListenerRef.current(gen);
      player.play();

      const lookaheadIndex = nextIndex + 1;
      if (lookaheadIndex < segments.length && !failedSegmentsRef.current.has(lookaheadIndex)) {
        const segText = segments[lookaheadIndex];
        streamStorySegment(activeStoryRef.current!.id, lookaheadIndex, segText)
          .then((seg) => {
            if (playbackGenerationRef.current !== gen) return;
            const currentIdx = nextSegmentIndexRef.current;
            if (currentIdx <= seg.segmentIndex) {
              segmentQueueRef.current.push({
                index: seg.segmentIndex,
                uri: seg.uri,
              });
            }
          })
          .catch(() => {
            if (playbackGenerationRef.current !== gen) return;
            failedSegmentsRef.current.add(lookaheadIndex);
            setIsBuffering(false);
            setIsPlaying(false);
          });
      }
    } else {
      const segText = segments[nextIndex];
      streamStorySegment(activeStoryRef.current!.id, nextIndex, segText)
        .then((seg) => {
          if (playbackGenerationRef.current !== gen) return;
          if (pendingSeekRef.current && pendingSeekRef.current.segmentIndex !== seg.segmentIndex) {
            return;
          }

          const player = createAudioPlayer({ uri: seg.uri });
          playerRef.current = player;
          nextSegmentIndexRef.current = nextIndex + 1;
          setIsBuffering(false);
          setIsPlaying(true);
          attachListenerRef.current(gen);
          player.play();

          const lookaheadIndex = nextIndex + 1;
          if (lookaheadIndex < segments.length && !failedSegmentsRef.current.has(lookaheadIndex)) {
            const lookaheadText = segments[lookaheadIndex];
            streamStorySegment(
              activeStoryRef.current!.id,
              lookaheadIndex,
              lookaheadText,
            )
              .then((lookaheadSeg) => {
                if (playbackGenerationRef.current !== gen) return;
                const currentIdx = nextSegmentIndexRef.current;
                if (currentIdx <= lookaheadSeg.segmentIndex) {
                  segmentQueueRef.current.push({
                    index: lookaheadSeg.segmentIndex,
                    uri: lookaheadSeg.uri,
                  });
                }
              })
              .catch(() => {
                if (playbackGenerationRef.current !== gen) return;
                failedSegmentsRef.current.add(lookaheadIndex);
              });
          }
        })
        .catch(() => {
          if (playbackGenerationRef.current !== gen) return;
          failedSegmentsRef.current.add(nextIndex);
          if (pendingSeekRef.current?.segmentIndex === nextIndex) {
            pendingSeekRef.current = null;
          }
          setIsBuffering(false);
          setIsPlaying(false);
        });
    }
  }, []);

  const attachSegmentListener = useCallback((gen: number) => {
    const listener = playerRef.current!.addListener('playbackStatusUpdate', (status) => {
      if (playbackGenerationRef.current !== gen) return;

      const segmentIndex = nextSegmentIndexRef.current - 1;
      if (segmentIndex >= 0 && status.duration > 0) {
        segmentDurationsRef.current[segmentIndex] = status.duration;
      }

      setPosition(cumulativeStart(segmentDurationsRef.current, segmentIndex) + status.currentTime);
      setDuration(segmentDurationsRef.current.reduce((a, b) => a + b, 0));
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.playing);

      if (pendingSeekRef.current && status.duration > 0) {
        const pending = pendingSeekRef.current;
        if (pending.segmentIndex === segmentIndex) {
          pendingSeekRef.current = null;
          playerRef.current?.seekTo(pending.offset);
        }
      }

      if (status.didJustFinish) {
        if (listenerRef.current) {
          listenerRef.current.remove();
          listenerRef.current = null;
        }

        const nextIndex = nextSegmentIndexRef.current;
        const segments = segmentsRef.current;

        if (nextIndex < segments.length) {
          if (playerRef.current) {
            playerRef.current.remove();
            playerRef.current = null;
          }
          setIsPlaying(false);
          setIsBuffering(true);
          playNextSegmentFromQueue(gen, nextIndex);
        } else {
          setIsPlaying(false);
          setIsBuffering(false);
          setPostStoryPhase('fading');
          startFade();
        }
      }
    });
    listenerRef.current = listener;
  }, [startFade, playNextSegmentFromQueue]);

  useEffect(() => {
    attachListenerRef.current = attachSegmentListener;
  }, [attachSegmentListener]);

  useEffect(() => {
    playNextSegmentFromQueueRef.current = playNextSegmentFromQueue;
  }, [playNextSegmentFromQueue]);

  const playStory = async (story: Story) => {
    playbackGenerationRef.current += 1;
    const gen = playbackGenerationRef.current;

    cleanupPlayer();
    setPostStoryPhase('idle');
    activeStoryRef.current = story;
    segmentQueueRef.current = [];
    nextSegmentIndexRef.current = 0;
    failedSegmentsRef.current = new Set();

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    if (playbackGenerationRef.current !== gen) return;

    const segments = splitStoryIntoSegments(story.story_text);
    segmentsRef.current = segments;
    segmentDurationsRef.current = segments.map((s) => s.length * ESTIMATED_SECONDS_PER_CHAR);
    pendingSeekRef.current = null;

    setIsBuffering(true);

    let firstSegment;
    try {
      firstSegment = await streamStorySegment(story.id, 0, segments[0]);
    } catch {
      if (playbackGenerationRef.current !== gen) return;
      setIsBuffering(false);
      setIsPlaying(false);
      return;
    }

    if (playbackGenerationRef.current !== gen) return;

    nextSegmentIndexRef.current = 1;

    const player = createAudioPlayer({ uri: firstSegment.uri });
    playerRef.current = player;

    setCurrentStory(story);
    setIsPlaying(true);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(segmentDurationsRef.current.reduce((a, b) => a + b, 0));
    player.play();

    attachSegmentListener(gen);

    if (segments.length > 1) {
      streamStorySegment(story.id, 1, segments[1])
        .then((seg) => {
          if (playbackGenerationRef.current !== gen) return;
          segmentQueueRef.current.push({ index: seg.segmentIndex, uri: seg.uri });
        })
        .catch(() => {
          if (playbackGenerationRef.current !== gen) return;
          failedSegmentsRef.current.add(1);
        });
    }
  };

  const pause = () => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setIsPlaying(false);
  };

  const resume = () => {
    if (playerRef.current) {
      playerRef.current.play();
    }
    setIsPlaying(true);
  };

  const seekTo = (seconds: number) => {
    const durations = segmentDurationsRef.current;
    if (durations.length === 0) return;
    if (!playerRef.current && !pendingSeekRef.current) return;

    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const clamped = Math.max(0, Math.min(seconds, totalDuration));

    let offset = clamped;
    let targetIndex = durations.length - 1;
    for (let i = 0; i < durations.length; i++) {
      if (offset < durations[i]) {
        targetIndex = i;
        break;
      }
      offset -= durations[i];
    }

    // skip segments known to have failed so the jump lands on playable audio
    while (targetIndex < durations.length && failedSegmentsRef.current.has(targetIndex)) {
      targetIndex += 1;
      offset = 0;
    }

    const currentIndex = nextSegmentIndexRef.current - 1;

    if (targetIndex >= durations.length) {
      // no playable audio remains ahead - seek to the end of the current
      // segment and let the natural didJustFinish flow drive the transition
      pendingSeekRef.current = null;
      playerRef.current?.seekTo(durations[currentIndex] ?? 0);
      return;
    }

    if (!pendingSeekRef.current && targetIndex === currentIndex) {
      playerRef.current?.seekTo(offset);
      return;
    }

    if (pendingSeekRef.current?.segmentIndex === targetIndex) {
      // retarget the in-flight jump with a new offset (e.g. seek-bar drag)
      pendingSeekRef.current.offset = offset;
      return;
    }

    // cross-segment jump (new, or superseding an in-flight one)
    if (playerRef.current) {
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }
      playerRef.current.remove();
      playerRef.current = null;
    }

    const gen = playbackGenerationRef.current;
    pendingSeekRef.current = { segmentIndex: targetIndex, offset };
    setIsBuffering(true);
    setIsPlaying(false);
    playNextSegmentFromQueueRef.current(gen, targetIndex);
  };

  const stopStory = () => {
    playbackGenerationRef.current += 1;
    segmentQueueRef.current = [];
    nextSegmentIndexRef.current = 0;
    segmentsRef.current = [];
    cleanupPlayer();
    setCurrentStory(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(0);
    segmentDurationsRef.current = [];
    pendingSeekRef.current = null;
    setPostStoryPhase('idle');
  };

  const toggleSleepMode = () => {
    setIsSleepMode((prev) => !prev);
  };

  const skipPillowTalk = () => {
    cleanupAmbient();
    setPostStoryPhase('affirmation');
  };

  const confirmAffirmation = () => {
    playbackGenerationRef.current += 1;
    segmentQueueRef.current = [];
    nextSegmentIndexRef.current = 0;
    segmentsRef.current = [];
    cleanupPlayer();
    setCurrentStory(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setPosition(0);
    setDuration(0);
    segmentDurationsRef.current = [];
    pendingSeekRef.current = null;
    setPostStoryPhase('done');
  };

  const startFadeToBlack = () => {
    setPostStoryPhase('fade_to_black');
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    const ambient = ambientPlayerRef.current;
    if (!ambient) {
      playbackGenerationRef.current += 1;
      segmentQueueRef.current = [];
      nextSegmentIndexRef.current = 0;
      segmentsRef.current = [];
      cleanupPlayer();
      setCurrentStory(null);
      setIsPlaying(false);
      setIsBuffering(false);
      setPosition(0);
      setDuration(0);
      segmentDurationsRef.current = [];
      pendingSeekRef.current = null;
      setPostStoryPhase('done');
      return;
    }

    const steps = FADE_TO_BLACK_DURATION / AMBIENT_FADE_INTERVAL;
    const startVolume = ambient.volume;
    let step = 0;

    fadeIntervalRef.current = setInterval(() => {
      step++;
      ambient.volume = Math.max(0, startVolume * (1 - step / steps));
      if (step >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        cleanupAmbient();
        playbackGenerationRef.current += 1;
        segmentQueueRef.current = [];
        nextSegmentIndexRef.current = 0;
        segmentsRef.current = [];
        segmentDurationsRef.current = [];
        pendingSeekRef.current = null;
        cleanupPlayer();
        setCurrentStory(null);
        setIsPlaying(false);
        setIsBuffering(false);
        setPosition(0);
        setDuration(0);
        setPostStoryPhase('done');
      }
    }, AMBIENT_FADE_INTERVAL);
  };

  useEffect(() => {
    return () => {
      playbackGenerationRef.current += 1;
      segmentDurationsRef.current = [];
      pendingSeekRef.current = null;
      cleanupPlayer();
    };
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
        startFadeToBlack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
