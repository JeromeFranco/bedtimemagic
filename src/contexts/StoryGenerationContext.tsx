import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { generateStory } from '@/api/stories';
import type {
  ChallengeCategory,
  ChallengeTrigger,
  DevelopmentalStage,
  Protagonist,
  Story,
} from '@/types';

export type StoryGenerationSnapshot = {
  childId: string;
  childName: string;
  protagonist: Protagonist;
  developmentalStage: DevelopmentalStage;
  category: ChallengeCategory;
  trigger: ChallengeTrigger;
};

type StoryGenerationBaseState = {
  snapshot: StoryGenerationSnapshot;
  hasLeftGenerationScreen: boolean;
};

export type StoryGenerationState =
  | { status: 'idle' }
  | ({ status: 'generating' } & StoryGenerationBaseState)
  | ({ status: 'ready'; story: Story } & StoryGenerationBaseState)
  | ({ status: 'failed'; error: unknown } & StoryGenerationBaseState);

type StartGenerationResult = { status: 'started' | 'already-generating' };

export type StoryGenerationContextValue = {
  state: StoryGenerationState;
  startGeneration: (snapshot: StoryGenerationSnapshot) => StartGenerationResult;
  continueInBackground: () => void;
  resumeWaiting: () => void;
  cancelGeneration: () => void;
  retryGeneration: () => StartGenerationResult;
  takeReadyStory: () => Story | null;
  dismissStatus: () => void;
};

const StoryGenerationContext = createContext<StoryGenerationContextValue | null>(null);

function captureSnapshot(snapshot: StoryGenerationSnapshot): StoryGenerationSnapshot {
  return {
    childId: snapshot.childId,
    childName: snapshot.childName,
    protagonist: snapshot.protagonist,
    developmentalStage: snapshot.developmentalStage,
    category: snapshot.category,
    trigger: snapshot.trigger,
  };
}

export function StoryGenerationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<StoryGenerationState>({ status: 'idle' });
  const stateRef = useRef<StoryGenerationState>(state);
  const requestTokenRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const setLifecycle = useCallback((nextState: StoryGenerationState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const runGeneration = useCallback((snapshot: StoryGenerationSnapshot, hasLeftGenerationScreen: boolean) => {
    if (stateRef.current.status === 'generating') {
      return { status: 'already-generating' } as const;
    }

    const capturedSnapshot = captureSnapshot(snapshot);
    const token = requestTokenRef.current + 1;
    const controller = new AbortController();
    requestTokenRef.current = token;
    activeControllerRef.current = controller;
    setLifecycle({
      status: 'generating',
      snapshot: capturedSnapshot,
      hasLeftGenerationScreen,
    });

    void generateStory(
      capturedSnapshot.childId,
      capturedSnapshot.protagonist,
      capturedSnapshot.childName,
      capturedSnapshot.developmentalStage,
      capturedSnapshot.category,
      capturedSnapshot.trigger,
      controller.signal,
    ).then((story) => {
      if (requestTokenRef.current !== token) return;

      queryClient.setQueryData(['story', story.id], story);
      activeControllerRef.current = null;
      setLifecycle({
        status: 'ready',
        snapshot: capturedSnapshot,
        hasLeftGenerationScreen: stateRef.current.status === 'generating'
          ? stateRef.current.hasLeftGenerationScreen
          : hasLeftGenerationScreen,
        story,
      });
      void queryClient.invalidateQueries({ queryKey: ['stories'] }).catch(() => {});
    }).catch((error: unknown) => {
      if (requestTokenRef.current !== token) return;

      console.error('Story generation failed', error);
      activeControllerRef.current = null;
      setLifecycle({
        status: 'failed',
        snapshot: capturedSnapshot,
        hasLeftGenerationScreen: stateRef.current.status === 'generating'
          ? stateRef.current.hasLeftGenerationScreen
          : hasLeftGenerationScreen,
        error,
      });
    });

    return { status: 'started' } as const;
  }, [queryClient, setLifecycle]);

  const startGeneration = useCallback((snapshot: StoryGenerationSnapshot) => (
    runGeneration(snapshot, false)
  ), [runGeneration]);

  const continueInBackground = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.status !== 'generating') return;
    setLifecycle({ ...currentState, hasLeftGenerationScreen: true });
  }, [setLifecycle]);

  const resumeWaiting = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.status === 'idle') return;
    setLifecycle({ ...currentState, hasLeftGenerationScreen: false });
  }, [setLifecycle]);

  const cancelGeneration = useCallback(() => {
    const controller = activeControllerRef.current;
    if (!controller && stateRef.current.status === 'idle') return;

    requestTokenRef.current += 1;
    activeControllerRef.current = null;
    setLifecycle({ status: 'idle' });
    controller?.abort();
  }, [setLifecycle]);

  const retryGeneration = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.status !== 'failed') {
      return { status: 'already-generating' } as const;
    }
    return runGeneration(currentState.snapshot, currentState.hasLeftGenerationScreen);
  }, [runGeneration]);

  const takeReadyStory = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.status !== 'ready') return null;

    setLifecycle({ status: 'idle' });
    return currentState.story;
  }, [setLifecycle]);

  const dismissStatus = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.status === 'ready' || currentState.status === 'failed') {
      setLifecycle({ status: 'idle' });
    }
  }, [setLifecycle]);

  return (
    <StoryGenerationContext.Provider
      value={{
        state,
        startGeneration,
        continueInBackground,
        resumeWaiting,
        cancelGeneration,
        retryGeneration,
        takeReadyStory,
        dismissStatus,
      }}
    >
      {children}
    </StoryGenerationContext.Provider>
  );
}

export function useStoryGeneration() {
  const context = useContext(StoryGenerationContext);
  if (!context) {
    throw new Error('useStoryGeneration must be used within a StoryGenerationProvider');
  }
  return context;
}
