import React, { createContext, useContext, useState } from 'react';

import type { DevelopmentalStage, Protagonist } from '@/types';

export type ProfileCreationMode = 'onboarding' | 'add';

export type ProfileDraft = {
  mode: ProfileCreationMode;
  nickname: string;
  developmentalStage: DevelopmentalStage | null;
  protagonist: Protagonist | null;
};

type ProfileDraftContextValue = {
  draft: ProfileDraft;
  begin: (mode: ProfileCreationMode) => void;
  setNickname: (nickname: string) => void;
  setDevelopmentalStage: (stage: DevelopmentalStage) => void;
  setProtagonist: (protagonist: Protagonist) => void;
  reset: () => void;
};

const initialDraft: ProfileDraft = {
  mode: 'onboarding',
  nickname: '',
  developmentalStage: null,
  protagonist: null,
};

const ProfileDraftContext = createContext<ProfileDraftContextValue>({
  draft: initialDraft,
  begin: () => {},
  setNickname: () => {},
  setDevelopmentalStage: () => {},
  setProtagonist: () => {},
  reset: () => {},
});

export function ProfileDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<ProfileDraft>(initialDraft);

  const begin = (mode: ProfileCreationMode) => {
    setDraft({ ...initialDraft, mode });
  };
  const setNickname = (nickname: string) => {
    setDraft((current) => ({ ...current, nickname }));
  };
  const setDevelopmentalStage = (developmentalStage: DevelopmentalStage) => {
    setDraft((current) => ({ ...current, developmentalStage }));
  };
  const setProtagonist = (protagonist: Protagonist) => {
    setDraft((current) => ({ ...current, protagonist }));
  };
  const reset = () => {
    setDraft(initialDraft);
  };

  return (
    <ProfileDraftContext.Provider
      value={{
        draft,
        begin,
        setNickname,
        setDevelopmentalStage,
        setProtagonist,
        reset,
      }}
    >
      {children}
    </ProfileDraftContext.Provider>
  );
}

export const useProfileDraft = () => useContext(ProfileDraftContext);
