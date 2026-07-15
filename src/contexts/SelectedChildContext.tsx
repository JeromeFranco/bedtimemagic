import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChildProfile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getChildren } from '@/api/children';

interface SelectedChildContextValue {
  profiles: ChildProfile[];
  selectedProfile: ChildProfile | null;
  setSelectedProfile: (profile: ChildProfile) => void;
}

const SelectedChildContext = createContext<SelectedChildContextValue>({
  profiles: [],
  selectedProfile: null,
  setSelectedProfile: () => {},
});

const STORAGE_KEY = 'selected_profile_id';

export function SelectedChildProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!user);
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (fetchedForRef.current === user.id) return;

    let cancelled = false;

    getChildren().then((children) => {
      if (cancelled) return;
      fetchedForRef.current = user.id;
      setProfiles(children);
      if (children.length > 0) {
        AsyncStorage.getItem(STORAGE_KEY).then((id) => {
          if (cancelled) return;
          const validId = children.some((p) => p.id === id) ? id : children[0].id;
          setSelectedProfileId(validId);
          setLoaded(true);
        }).catch(() => {
          if (cancelled) return;
          setSelectedProfileId(children[0].id);
          setLoaded(true);
        });
      } else {
        setSelectedProfileId(null);
        setLoaded(true);
      }
    }).catch(() => {
      if (cancelled) return;
      setProfiles([]);
      setSelectedProfileId(null);
      setLoaded(true);
    });

    return () => { cancelled = true; };
  }, [user]);

  const setSelectedProfile = useCallback((profile: ChildProfile) => {
    setSelectedProfileId(profile.id);
    AsyncStorage.setItem(STORAGE_KEY, profile.id);
  }, []);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  if (!loaded) return null;

  return (
    <SelectedChildContext.Provider
      value={{ profiles, selectedProfile, setSelectedProfile }}
    >
      {children}
    </SelectedChildContext.Provider>
  );
}

export const useSelectedChild = () => useContext(SelectedChildContext);
