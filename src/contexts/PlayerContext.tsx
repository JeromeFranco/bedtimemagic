import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Story } from '@/types';

interface PlayerContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isSleepMode: boolean;
  playStory: (story: Story) => void;
  stopStory: () => void;
  toggleSleepMode: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentStory: null,
  isPlaying: false,
  isSleepMode: false,
  playStory: () => {},
  stopStory: () => {},
  toggleSleepMode: () => {},
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);

  const playStory = useCallback((story: Story) => {
    setCurrentStory(story);
    setIsPlaying(true);
    setIsSleepMode(false);
  }, []);

  const stopStory = useCallback(() => {
    setIsPlaying(false);
    setIsSleepMode(false);
    setCurrentStory(null);
  }, []);

  const toggleSleepMode = useCallback(() => {
    setIsSleepMode((prev) => !prev);
  }, []);

  return (
    <PlayerContext.Provider
      value={{ currentStory, isPlaying, isSleepMode, playStory, stopStory, toggleSleepMode }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
