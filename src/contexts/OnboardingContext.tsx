import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useSelectedChild } from '@/contexts/SelectedChildContext';

export type OnboardingStatus = 'loading' | 'authError' | 'required' | 'ready';

type OnboardingContextValue = {
  status: OnboardingStatus;
  error: Error | null;
  completeOnboarding: () => Promise<void>;
  retryBootstrap: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue>({
  status: 'loading',
  error: null,
  completeOnboarding: async () => {},
  retryBootstrap: () => {},
});

const STORAGE_KEY = 'onboarding_complete_v1';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    isLoading: isAuthLoading,
    error: authError,
    retryAnonymousSignIn,
  } = useAuth();
  const {
    profiles,
    isLoading: areProfilesLoading,
    error: profileError,
    retryLoading,
  } = useSelectedChild();
  const [classification, setClassification] = useState<{
    requestKey: string;
    status: Exclude<OnboardingStatus, 'loading'>;
    error: Error | null;
  } | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const userId = user?.id ?? null;
  const requestKey = userId ? `${userId}:${bootstrapAttempt}` : null;

  useEffect(() => {
    let cancelled = false;

    if (
      !requestKey
      || isAuthLoading
      || areProfilesLoading
      || authError
      || profileError
      || classification?.requestKey === requestKey
    ) {
      return () => {
        cancelled = true;
      };
    }

    async function classifyBootstrap() {
      try {
        const completion = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled || !requestKey) return;

        if (completion === userId) {
          setClassification({ requestKey, status: 'ready', error: null });
          return;
        }

        if (profiles.length > 0 && userId) {
          void AsyncStorage.setItem(STORAGE_KEY, userId).catch(() => {});
          setClassification({ requestKey, status: 'ready', error: null });
          return;
        }

        setClassification({ requestKey, status: 'required', error: null });
      } catch (caught) {
        if (cancelled || !requestKey) return;
        setClassification({
          requestKey,
          status: 'authError',
          error: caught instanceof Error ? caught : new Error('Unable to load onboarding'),
        });
      }
    }

    void classifyBootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    areProfilesLoading,
    authError,
    classification?.requestKey,
    isAuthLoading,
    profileError,
    profiles,
    requestKey,
    userId,
  ]);

  let status: OnboardingStatus = 'loading';
  let error: Error | null = null;
  if (!isAuthLoading && !areProfilesLoading && (authError || profileError)) {
    status = 'authError';
    error = authError ?? profileError;
  } else if (requestKey && classification?.requestKey === requestKey) {
    status = classification.status;
    error = classification.error;
  }

  const completeOnboarding = async () => {
    if (userId) {
      await AsyncStorage.setItem(STORAGE_KEY, userId).catch(() => {});
    }
    if (requestKey) {
      setClassification({ requestKey, status: 'ready', error: null });
    }
  };

  const retryBootstrap = () => {
    if (authError) {
      retryAnonymousSignIn();
    } else if (profileError) {
      retryLoading();
    } else {
      setBootstrapAttempt((attempt) => attempt + 1);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{ status, error, completeOnboarding, retryBootstrap }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);
