import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChildProfile } from '@/types';
import { SEED_PROFILES, DEFAULT_PROFILE_ID } from '@/constants/profiles';

interface SelectedChildContextValue {
  profiles: ChildProfile[];
  selectedProfile: ChildProfile | null;
  setSelectedProfile: (profile: ChildProfile) => void;
}

const SelectedChildContext = createContext<SelectedChildContextValue>({
  profiles: SEED_PROFILES,
  selectedProfile: null,
  setSelectedProfile: () => {},
});

const STORAGE_KEY = 'selected_profile_id';

export function SelectedChildProvider({ children }: { children: React.ReactNode }) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((id) => {
      setSelectedProfileId(id ?? DEFAULT_PROFILE_ID);
      setLoaded(true);
    });
  }, []);

  const setSelectedProfile = useCallback((profile: ChildProfile) => {
    setSelectedProfileId(profile.id);
    AsyncStorage.setItem(STORAGE_KEY, profile.id);
  }, []);

  const selectedProfile = SEED_PROFILES.find((p) => p.id === selectedProfileId) ?? null;

  if (!loaded) return null;

  return (
    <SelectedChildContext.Provider
      value={{ profiles: SEED_PROFILES, selectedProfile, setSelectedProfile }}
    >
      {children}
    </SelectedChildContext.Provider>
  );
}

export const useSelectedChild = () => useContext(SelectedChildContext);
