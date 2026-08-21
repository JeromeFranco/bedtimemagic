import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createChild, getChildren } from '@/api/children';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ChildProfile,
  DevelopmentalStage,
  Protagonist,
} from '@/types';

type CreateProfileInput = {
  nickname: string;
  developmentalStage: DevelopmentalStage;
  protagonist: Protagonist;
};

interface SelectedChildContextValue {
  profiles: ChildProfile[];
  selectedProfile: ChildProfile | null;
  isLoading: boolean;
  error: Error | null;
  setSelectedProfile: (profile: ChildProfile) => void;
  createProfile: (input: CreateProfileInput) => Promise<ChildProfile>;
  retryLoading: () => void;
}

const SelectedChildContext = createContext<SelectedChildContextValue>({
  profiles: [],
  selectedProfile: null,
  isLoading: true,
  error: null,
  setSelectedProfile: () => {},
  createProfile: async () => {
    throw new Error('SelectedChildProvider is missing');
  },
  retryLoading: () => {},
});

const STORAGE_KEY = 'selected_profile_id';

export function SelectedChildProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const userId = user?.id ?? null;
  const requestKey = userId ? `${userId}:${loadAttempt}` : null;

  useEffect(() => {
    let cancelled = false;

    if (!userId || !requestKey) {
      return () => {
        cancelled = true;
      };
    }

    async function loadProfiles() {
      try {
        const children = await getChildren();
        const storedId = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
        if (cancelled) return;

        setProfiles(children);
        setSelectedProfileId(
          children.some((profile) => profile.id === storedId)
            ? storedId
            : children[0]?.id ?? null,
        );
        setLoadError(null);
      } catch (caught) {
        if (cancelled) return;
        setProfiles([]);
        setSelectedProfileId(null);
        setLoadError(
          caught instanceof Error ? caught : new Error('Unable to load profiles'),
        );
      } finally {
        if (!cancelled) setLoadedRequest(requestKey);
      }
    }

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [requestKey, userId]);

  const isCurrentRequest = loadedRequest === requestKey;
  const currentProfiles = isCurrentRequest ? profiles : [];
  const isLoading = isAuthLoading || Boolean(userId && !isCurrentRequest);
  const error = isCurrentRequest ? loadError : null;

  const setSelectedProfile = (profile: ChildProfile) => {
    setSelectedProfileId(profile.id);
    void AsyncStorage.setItem(STORAGE_KEY, profile.id).catch(() => {});
  };

  const createProfile = async (input: CreateProfileInput) => {
    const profile = await createChild(
      input.nickname,
      input.developmentalStage,
      input.protagonist,
    );
    setProfiles((current) => (
      current.some((existing) => existing.id === profile.id)
        ? current
        : [...current, profile]
    ));
    setSelectedProfileId(profile.id);
    await AsyncStorage.setItem(STORAGE_KEY, profile.id).catch(() => {});
    return profile;
  };

  const retryLoading = () => {
    setLoadAttempt((attempt) => attempt + 1);
  };

  const selectedProfile =
    currentProfiles.find((profile) => profile.id === selectedProfileId) ?? null;

  return (
    <SelectedChildContext.Provider
      value={{
        profiles: currentProfiles,
        selectedProfile,
        isLoading,
        error,
        setSelectedProfile,
        createProfile,
        retryLoading,
      }}
    >
      {children}
    </SelectedChildContext.Provider>
  );
}

export const useSelectedChild = () => useContext(SelectedChildContext);
