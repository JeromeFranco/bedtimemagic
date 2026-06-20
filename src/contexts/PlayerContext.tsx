import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAudioSource } from '@/lib/audio-utils';
import type { Story } from '@/types';

interface PlayerContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isBuffering: boolean;
  isSleepMode: boolean;
  position: number;
  duration: number;
  playStory: (story: Story) => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  stopStory: () => void;
  toggleSleepMode: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentStory: null,
  isPlaying: false,
  isBuffering: false,
  isSleepMode: false,
  position: 0,
  duration: 0,
  playStory: () => {},
  pause: () => {},
  resume: () => {},
  seekTo: () => {},
  stopStory: () => {},
  toggleSleepMode: () => {},
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  const cleanupPlayer = useCallback(() => {
    if (listenerRef.current) {
      listenerRef.current.remove();
      listenerRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }
  }, []);

  const playStory = useCallback(async (story: Story) => {
    cleanupPlayer();

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });

    const source = getAudioSource(story);
    const player = createAudioPlayer(source);
    playerRef.current = player;

    const listener = player.addListener('playbackStatusUpdate', (status) => {
      setPosition(status.currentTime);
      setDuration(status.duration);
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.playing);

      if (status.didJustFinish) {
        cleanupPlayer();
        setCurrentStory(null);
        setIsPlaying(false);
        setIsBuffering(false);
        setPosition(0);
        setDuration(0);
      }
    });
    listenerRef.current = listener;

    setCurrentStory(story);
    setIsPlaying(true);
    setIsSleepMode(false);
    setPosition(0);
    setDuration(0);
    player.play();
  }, [cleanupPlayer]);

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
  }, [cleanupPlayer]);

  const toggleSleepMode = useCallback(() => {
    setIsSleepMode((prev) => !prev);
  }, []);

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
        playStory,
        pause,
        resume,
        seekTo,
        stopStory,
        toggleSleepMode,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
