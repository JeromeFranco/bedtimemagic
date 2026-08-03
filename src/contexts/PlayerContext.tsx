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

  const playNextSegmentFromQueue = useCallback(
    (gen: number, nextIndex: number) => {
      if (failedSegmentsRef.current.has(nextIndex)) {
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
            setIsBuffering(false);
            setIsPlaying(false);
          });
      }
    },
    [],
  );

  const attachSegmentListener = useCallback(
    (gen: number) => {
      const listener = playerRef.current!.addListener('playbackStatusUpdate', (status) => {
        if (playbackGenerationRef.current !== gen) return;

        setPosition(status.currentTime);
        setDuration(status.duration);
        setIsBuffering(status.isBuffering);
        setIsPlaying(status.playing);

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
    },
    [startFade, playNextSegmentFromQueue],
  );

  useEffect(() => {
    attachListenerRef.current = attachSegmentListener;
  }, [attachSegmentListener]);

  useEffect(() => {
    playNextSegmentFromQueueRef.current = playNextSegmentFromQueue;
  }, [playNextSegmentFromQueue]);

  const playStory = useCallback(
    async (story: Story) => {
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
      setDuration(0);
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
    },
    [cleanupPlayer, attachSegmentListener],
  );

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
    setPostStoryPhase('done');
  }, [cleanupPlayer]);

  const startFadeToBlack = useCallback(() => {
    setPostStoryPhase('fade_to_black');
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    const ambient = ambientPlayerRef.current;
    ambientPlayerRef.current = null;
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
        ambient.remove();
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
        setPostStoryPhase('done');
      }
    }, AMBIENT_FADE_INTERVAL);
  }, [cleanupPlayer]);

  useEffect(() => {
    return () => {
      playbackGenerationRef.current += 1;
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
