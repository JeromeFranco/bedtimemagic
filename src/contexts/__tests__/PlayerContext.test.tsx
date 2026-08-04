import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockSeekTo = jest.fn();
const mockRemove = jest.fn();
const mockAddListener = jest.fn();

const mockPlayer = {
  play: mockPlay,
  pause: mockPause,
  seekTo: mockSeekTo,
  remove: mockRemove,
  addListener: mockAddListener,
};

const mockAmbientPlay = jest.fn();
const mockAmbientRemove = jest.fn();
const mockAmbientPlayer = {
  play: mockAmbientPlay,
  pause: jest.fn(),
  seekTo: jest.fn(),
  remove: mockAmbientRemove,
  addListener: jest.fn(),
  volume: 0,
  loop: false,
};

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

const mockStreamStorySegment = jest.fn();
const mockSplitStoryIntoSegments = jest.fn((text: string) => [text]);

jest.mock('@/lib/inworld-tts', () => ({
  streamStorySegment: (...args: [string, number, string]) => mockStreamStorySegment(...args),
}));

jest.mock('@/lib/story-segments', () => ({
  splitStoryIntoSegments: (...args: [string]) => mockSplitStoryIntoSegments(...args),
}));

jest.mock('@/lib/audio-utils', () => ({
  getAmbientAudioSource: jest.fn(() => 'ambient-rain'),
}));

import { PlayerProvider, usePlayer } from '../PlayerContext';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAmbientAudioSource } from '@/lib/audio-utils';
import type { Story } from '@/types';

const MOCK_STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Test Story',
  story_text: 'Once upon a time...',
  moral: 'Be kind.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am brave.',
  cover_image_url: null,
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-06-21T00:00:00Z',
};

const MOCK_STORY_2: Story = {
  ...MOCK_STORY,
  id: 'story-2',
  title: 'Another Story',
};

const MOCK_STORY_NO_PROMPT: Story = {
  ...MOCK_STORY,
  id: 'story-no-prompt',
  pillow_talk_prompt: '',
  sleepy_affirmation: 'I am calm.',
};

const MOCK_STORY_NO_PROMPT_NO_AFFIRMATION: Story = {
  ...MOCK_STORY,
  id: 'story-no-prompt-no-affirmation',
  pillow_talk_prompt: '',
  sleepy_affirmation: '',
};

let seekSecondsOverride: number | null = null;

function TestComponent() {
  const {
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
  } = usePlayer();

  return (
    <View>
      <Text testID="currentStory">{currentStory?.title ?? 'none'}</Text>
      <Text testID="isPlaying">{String(isPlaying)}</Text>
      <Text testID="isBuffering">{String(isBuffering)}</Text>
      <Text testID="isSleepMode">{String(isSleepMode)}</Text>
      <Text testID="position">{String(position)}</Text>
      <Text testID="duration">{String(duration)}</Text>
      <Text testID="postStoryPhase">{postStoryPhase}</Text>
      <Pressable testID="play" onPress={() => playStory(MOCK_STORY)} />
      <Pressable testID="play2" onPress={() => playStory(MOCK_STORY_2)} />
      <Pressable testID="pause" onPress={pause} />
      <Pressable testID="resume" onPress={resume} />
      <Pressable testID="seek" onPress={() => seekTo(30)} />
      <Pressable testID="seekAcross" onPress={() => seekTo(40.5)} />
      <Pressable testID="seekAny" onPress={() => seekTo(seekSecondsOverride ?? 40.5)} />
      <Pressable testID="stop" onPress={stopStory} />
      <Pressable testID="toggleSleep" onPress={toggleSleepMode} />
      <Pressable testID="skipPillowTalk" onPress={skipPillowTalk} />
      <Pressable testID="confirmAffirmation" onPress={confirmAffirmation} />
      <Pressable testID="startFadeToBlack" onPress={startFadeToBlack} />
      <Pressable testID="playNoPrompt" onPress={() => playStory(MOCK_STORY_NO_PROMPT)} />
      <Pressable testID="playNoPromptNoAffirmation" onPress={() => playStory(MOCK_STORY_NO_PROMPT_NO_AFFIRMATION)} />
    </View>
  );
}

async function renderProvider() {
  return render(
    <PlayerProvider>
      <TestComponent />
    </PlayerProvider>
  );
}

describe('PlayerContext', () => {
  let statusCallback: (status: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    seekSecondsOverride = null;
    jest.useRealTimers();
    (createAudioPlayer as jest.Mock).mockImplementation(() => mockPlayer);
    mockSplitStoryIntoSegments.mockImplementation((text: string) => [text]);
    mockStreamStorySegment.mockImplementation(
      async (storyId: string, segmentIndex: number, text: string) => ({
        storyId,
        segmentIndex,
        text,
        uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
      }),
    );
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallback = cb;
      return { remove: jest.fn() };
    });
  });

  it('has correct initial state', async () => {
    const { getByTestId } = await renderProvider();
    expect(getByTestId('currentStory').props.children).toBe('none');
    expect(getByTestId('isPlaying').props.children).toBe('false');
    expect(getByTestId('isBuffering').props.children).toBe('false');
    expect(getByTestId('isSleepMode').props.children).toBe('false');
    expect(getByTestId('position').props.children).toBe('0');
    expect(getByTestId('duration').props.children).toBe('0');
  });

  it('playStory sets story and starts playing', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    expect(getByTestId('currentStory').props.children).toBe('Test Story');
    expect(getByTestId('isPlaying').props.children).toBe('true');
    expect(mockStreamStorySegment).toHaveBeenCalledWith('story-1', 0, 'Once upon a time...');
    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: 'file://seg-story-1-0.mp3' });
    expect(mockPlay).toHaveBeenCalled();
  });

  it('playStory configures audio mode for background playback', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  });

  it('playStory registers playback status listener', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    expect(mockAddListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));
  });

  it('listener updates position and duration from status', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({ currentTime: 15, duration: 120, playing: true, isBuffering: false, didJustFinish: false }));
    expect(getByTestId('position').props.children).toBe('15');
    expect(getByTestId('duration').props.children).toBe('120');
  });

  it('listener updates isBuffering from status', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({ currentTime: 0, duration: 0, playing: false, isBuffering: true, didJustFinish: false }));
    expect(getByTestId('isBuffering').props.children).toBe('true');
  });

  it('pause stops playback', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => fireEvent.press(getByTestId('pause')));
    expect(mockPause).toHaveBeenCalled();
    expect(getByTestId('isPlaying').props.children).toBe('false');
  });

  it('resume resumes playback', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => fireEvent.press(getByTestId('pause')));
    await act(async () => fireEvent.press(getByTestId('resume')));
    expect(mockPlay).toHaveBeenCalledTimes(2);
    expect(getByTestId('isPlaying').props.children).toBe('true');
  });

  it('seekTo resolves to the current segment and calls player.seekTo', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({ currentTime: 15, duration: 120, playing: true, isBuffering: false, didJustFinish: false }));
    await act(async () => fireEvent.press(getByTestId('seek')));
    expect(mockSeekTo).toHaveBeenCalledWith(30);
  });

  it('estimates total duration before any segment plays', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    // MOCK_STORY story_text is 19 chars -> 19 * 0.07 = 1.33s
    expect(Number(getByTestId('duration').props.children)).toBeCloseTo(1.33, 5);
  });

  it('reports cumulative position across segment boundary', async () => {
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text']);
    mockStreamStorySegment.mockImplementation(
      async (storyId: string, segmentIndex: number, text: string) => ({
        storyId,
        segmentIndex,
        text,
        uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
      }),
    );

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    // Segment 0 finishes at 40s
    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 40, duration: 40, playing: false, isBuffering: false, didJustFinish: true,
      });
    });
    await act(async () => {});

    // Segment 1 plays at 5s of its own timeline -> total position 45s
    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 5, duration: 30, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    expect(Number(getByTestId('position').props.children)).toBe(45);
    expect(Number(getByTestId('duration').props.children)).toBe(70);
  });

  it('seek across segments jumps to the target segment and applies the offset once loaded', async () => {
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text']);
    mockStreamStorySegment.mockImplementation(
      async (storyId: string, segmentIndex: number, text: string) => ({
        storyId,
        segmentIndex,
        text,
        uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
      }),
    );

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    // Segment 0 reports its real duration (40s); segment 1 is still an estimate (~0.7s)
    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 40, duration: 40, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    mockRemove.mockClear();

    // Seek to 40.5s -> segment 1 at offset 0.5s
    await act(async () => fireEvent.press(getByTestId('seekAcross')));

    expect(mockRemove).toHaveBeenCalled();
    expect(getByTestId('isPlaying').props.children).toBe('true');

    // Target segment loads and reports its duration -> pending offset applied once
    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 0, duration: 30, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    expect(mockSeekTo).toHaveBeenCalledTimes(1);
    expect(mockSeekTo).toHaveBeenCalledWith(0.5);
    expect(Number(getByTestId('position').props.children)).toBe(40);
    expect(Number(getByTestId('duration').props.children)).toBe(70);
  });

  it('seek skips segments known to have failed and lands on playable audio', async () => {
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text', 'seg-2-text']);
    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) => {
        if (segmentIndex === 1) {
          return Promise.reject(new Error('segment 1 failed'));
        }
        return Promise.resolve({
          storyId,
          segmentIndex,
          text,
          uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
        });
      },
    );

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => {}); // flush the segment 1 lookahead failure

    // Segment 0 reports its real duration (40s); segment 1 is marked failed
    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 40, duration: 40, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    mockSeekTo.mockClear();

    // Seek to 40.5s -> resolves to failed segment 1 -> skips to segment 2
    await act(async () => fireEvent.press(getByTestId('seekAcross')));
    await act(async () => {});

    expect(getByTestId('isPlaying').props.children).toBe('true');

    // Segment 2 loads -> pending offset 0 applied exactly once
    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 0, duration: 30, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    expect(mockSeekTo).toHaveBeenCalledTimes(1);
    expect(mockSeekTo.mock.calls[0][0]).toBe(0);
    expect(Number(getByTestId('position').props.children)).toBeCloseTo(40.7, 5);
  });

  it('seek to a failed final segment falls back to the end of the current segment', async () => {
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text']);
    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) => {
        if (segmentIndex === 1) {
          return Promise.reject(new Error('segment 1 failed'));
        }
        return Promise.resolve({
          storyId,
          segmentIndex,
          text,
          uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
        });
      },
    );

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => {}); // flush the segment 1 lookahead failure

    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 40, duration: 40, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    mockSeekTo.mockClear();

    // Seek to 40.5s -> resolves to failed segment 1 -> no playable audio ahead
    await act(async () => fireEvent.press(getByTestId('seekAcross')));

    expect(mockSeekTo).toHaveBeenCalledTimes(1);
    expect(mockSeekTo.mock.calls[0][0]).toBe(40); // end of the current segment
    expect(getByTestId('isPlaying').props.children).toBe('true');
  });

  it('supersedes an in-flight cross-segment jump when seeking to a different segment', async () => {
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text', 'seg-2-text']);
    const seg2Resolvers: (() => void)[] = [];
    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) => {
        if (segmentIndex === 0 || segmentIndex === 1) {
          return Promise.resolve({
            storyId,
            segmentIndex,
            text,
            uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
          });
        }
        return new Promise((resolve) => {
          seg2Resolvers.push(() =>
            resolve({
              storyId,
              segmentIndex,
              text,
              uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
            }),
          );
        });
      },
    );

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 40, duration: 40, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    mockSeekTo.mockClear();

    // Seek to 40.5s -> jumps to segment 1 (queued, plays immediately)
    await act(async () => fireEvent.press(getByTestId('seekAcross')));
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
    expect(getByTestId('isPlaying').props.children).toBe('true');

    // Seek to 41.2s -> retargets the jump to segment 2 while segment 1 plays
    seekSecondsOverride = 41.2;
    await act(async () => fireEvent.press(getByTestId('seekAny')));
    expect(getByTestId('isBuffering').props.children).toBe('true');
    expect(seg2Resolvers).toHaveLength(2); // lookahead (from segment 1) + jump stream

    // The lookahead stream resolves first -> only queues, no player created
    await act(async () => seg2Resolvers[0]());
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);

    // The jump stream resolves -> segment 2 player created
    await act(async () => seg2Resolvers[1]());
    expect(createAudioPlayer).toHaveBeenCalledTimes(3);

    // Segment 2 loads -> pending offset applied exactly once
    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 0, duration: 30, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    expect(mockSeekTo).toHaveBeenCalledTimes(1);
    expect(mockSeekTo.mock.calls[0][0]).toBeCloseTo(0.5, 5);
    expect(getByTestId('isPlaying').props.children).toBe('true');
  });

  it('updates the pending offset when seeking again to the same in-flight target', async () => {
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text', 'seg-2-text']);
    let seg2Resolve: (() => void) | undefined;
    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) => {
        if (segmentIndex === 0 || segmentIndex === 1) {
          return Promise.resolve({
            storyId,
            segmentIndex,
            text,
            uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
          });
        }
        return new Promise((resolve) => {
          seg2Resolve = () =>
            resolve({
              storyId,
              segmentIndex,
              text,
              uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
            });
        });
      },
    );

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 40, duration: 40, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    mockSeekTo.mockClear();

    // Seek to 41.0s -> jump to segment 2 (not queued, stream in flight)
    seekSecondsOverride = 41;
    await act(async () => fireEvent.press(getByTestId('seekAny')));
    expect(getByTestId('isBuffering').props.children).toBe('true');

    // Drag continues to 41.3s -> same target, offset updated on the pending jump
    seekSecondsOverride = 41.3;
    await act(async () => fireEvent.press(getByTestId('seekAny')));
    expect(getByTestId('isBuffering').props.children).toBe('true');

    await act(async () => seg2Resolve!());

    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 0, duration: 30, playing: true, isBuffering: false, didJustFinish: false,
      });
    });

    expect(mockSeekTo).toHaveBeenCalledTimes(1);
    expect(mockSeekTo.mock.calls[0][0]).toBeCloseTo(0.6, 5);
    expect(getByTestId('isPlaying').props.children).toBe('true');
  });

  it('stopStory clears state and removes player', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => fireEvent.press(getByTestId('stop')));
    expect(getByTestId('currentStory').props.children).toBe('none');
    expect(getByTestId('isPlaying').props.children).toBe('false');
    expect(getByTestId('position').props.children).toBe('0');
    expect(getByTestId('duration').props.children).toBe('0');
    expect(mockRemove).toHaveBeenCalled();
  });

  it('playStory cleans up previous player before creating new one', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => fireEvent.press(getByTestId('play2')));
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
    expect(getByTestId('currentStory').props.children).toBe('Another Story');
  });

  it('toggleSleepMode toggles sleep mode', async () => {
    const { getByTestId } = await renderProvider();
    expect(getByTestId('isSleepMode').props.children).toBe('false');
    await act(async () => fireEvent.press(getByTestId('toggleSleep')));
    expect(getByTestId('isSleepMode').props.children).toBe('true');
    await act(async () => fireEvent.press(getByTestId('toggleSleep')));
    expect(getByTestId('isSleepMode').props.children).toBe('false');
  });

  it('didJustFinish transitions to pillow_talk after fade completes', async () => {
    jest.useFakeTimers();
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({ currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true }));
    expect(getByTestId('isPlaying').props.children).toBe('false');
    expect(getByTestId('postStoryPhase').props.children).toBe('fading');

    await act(async () => { jest.advanceTimersByTime(3100); });

    expect(getByTestId('currentStory').props.children).toBe('Test Story');
    expect(getByTestId('postStoryPhase').props.children).toBe('pillow_talk');
    jest.useRealTimers();
  });

  it('initializes postStoryPhase as idle', async () => {
    const { getByTestId } = await renderProvider();
    expect(getByTestId('postStoryPhase').props.children).toBe('idle');
  });

  it('transitions to pillow_talk when didJustFinish fires and has prompt', async () => {
    jest.useFakeTimers();
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(getByTestId('postStoryPhase').props.children).toBe('pillow_talk');
    expect(getByTestId('currentStory').props.children).toBe('Test Story');
    jest.useRealTimers();
  });

  it('skipPillowTalk transitions from pillow_talk to affirmation', async () => {
    jest.useFakeTimers();
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    await act(async () => fireEvent.press(getByTestId('skipPillowTalk')));
    expect(getByTestId('postStoryPhase').props.children).toBe('affirmation');
    jest.useRealTimers();
  });

  it('confirmAffirmation transitions to done', async () => {
    jest.useFakeTimers();
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    await act(async () => fireEvent.press(getByTestId('confirmAffirmation')));
    expect(getByTestId('postStoryPhase').props.children).toBe('done');
    jest.useRealTimers();
  });

  it('stopStory resets postStoryPhase to idle', async () => {
    jest.useFakeTimers();
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(getByTestId('postStoryPhase').props.children).toBe('pillow_talk');
    await act(async () => fireEvent.press(getByTestId('stop')));
    expect(getByTestId('postStoryPhase').props.children).toBe('idle');
    jest.useRealTimers();
  });

  it('skips pillow talk when prompt is empty', async () => {
    jest.useFakeTimers();
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('playNoPrompt')));
    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(getByTestId('postStoryPhase').props.children).toBe('affirmation');
    jest.useRealTimers();
  });

  it('transitions to done when no prompt and no affirmation', async () => {
    jest.useFakeTimers();
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('playNoPromptNoAffirmation')));
    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(getByTestId('postStoryPhase').props.children).toBe('done');
    jest.useRealTimers();
  });

  it('starts ambient audio when entering pillow_talk phase', async () => {
    jest.useFakeTimers();
    (createAudioPlayer as jest.Mock).mockImplementation(() => mockPlayer);
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    (createAudioPlayer as jest.Mock).mockImplementation(() => mockAmbientPlayer);

    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(getByTestId('postStoryPhase').props.children).toBe('pillow_talk');
    expect(getAmbientAudioSource).toHaveBeenCalled();
    expect(createAudioPlayer).toHaveBeenCalledWith('ambient-rain');
    expect(mockAmbientPlayer.volume).toBe(0.15);
    expect(mockAmbientPlayer.loop).toBe(true);
    expect(mockAmbientPlay).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('skipPillowTalk stops ambient player before transitioning', async () => {
    jest.useFakeTimers();
    (createAudioPlayer as jest.Mock).mockImplementation(() => mockPlayer);
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    (createAudioPlayer as jest.Mock).mockImplementation(() => mockAmbientPlayer);

    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(getByTestId('postStoryPhase').props.children).toBe('pillow_talk');

    await act(async () => fireEvent.press(getByTestId('skipPillowTalk')));
    expect(mockAmbientRemove).toHaveBeenCalled();
    expect(getByTestId('postStoryPhase').props.children).toBe('affirmation');
    jest.useRealTimers();
  });

  it('starts the first segment when it is ready and streams later segments sequentially', async () => {
    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) => {
        if (segmentIndex === 0) {
          return Promise.resolve({
            storyId,
            segmentIndex,
            text,
            uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
          });
        }
        return new Promise(() => {});
      },
    );
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text']);

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    expect(mockStreamStorySegment).toHaveBeenCalledTimes(2);
    expect(mockStreamStorySegment).toHaveBeenCalledWith('story-1', 0, 'seg-0-text');
    expect(mockStreamStorySegment).toHaveBeenCalledWith('story-1', 1, 'seg-1-text');
    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: 'file://seg-story-1-0.mp3' });
    expect(getByTestId('isPlaying').props.children).toBe('true');
  });

  it('skips failed segments and plays the next one at boundary', async () => {
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text', 'seg-2-text']);

    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) => {
        if (segmentIndex === 0) {
          return Promise.resolve({
            storyId,
            segmentIndex,
            text,
            uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
          });
        }
        if (segmentIndex === 1) {
          return Promise.reject(new Error('segment 1 failed'));
        }
        return Promise.resolve({
          storyId,
          segmentIndex,
          text,
          uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
        });
      },
    );

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    expect(getByTestId('isPlaying').props.children).toBe('true');

    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 120,
        duration: 120,
        playing: false,
        isBuffering: false,
        didJustFinish: true,
      });
    });

    await act(async () => {});

    expect(getByTestId('isPlaying').props.children).toBe('true');
    expect(getByTestId('isBuffering').props.children).toBe('false');
  });

  it('records initial lookahead segment failure in failedSegmentsRef', async () => {
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text', 'seg-2-text']);

    let seg2Resolve: ((value: any) => void) | undefined;
    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) => {
        if (segmentIndex === 0) {
          return Promise.resolve({
            storyId,
            segmentIndex,
            text,
            uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
          });
        }
        if (segmentIndex === 1) {
          return Promise.reject(new Error('lookahead failed'));
        }
        return new Promise((resolve) => {
          seg2Resolve = () =>
            resolve({
              storyId,
              segmentIndex,
              text,
              uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
            });
        });
      },
    );

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    expect(getByTestId('isPlaying').props.children).toBe('true');

    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 120,
        duration: 120,
        playing: false,
        isBuffering: false,
        didJustFinish: true,
      });
    });

    await act(async () => seg2Resolve!(undefined));

    expect(getByTestId('isPlaying').props.children).toBe('true');
    expect(getByTestId('isBuffering').props.children).toBe('false');
  });

  it('buffers at a segment boundary until the next segment is ready', async () => {
    let seg1Resolve: (() => void) | undefined;

    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) => {
        if (segmentIndex === 0) {
          return Promise.resolve({
            storyId,
            segmentIndex,
            text,
            uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
          });
        }
        return new Promise((resolve) => {
          seg1Resolve = () =>
            resolve({
              storyId,
              segmentIndex,
              text,
              uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
            });
        });
      },
    );
    mockSplitStoryIntoSegments.mockImplementation(() => ['seg-0-text', 'seg-1-text']);

    const statusCallbacks: ((status: any) => void)[] = [];
    mockAddListener.mockImplementation((_event: string, cb: (status: any) => void) => {
      statusCallbacks.push(cb);
      return { remove: jest.fn() };
    });

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    expect(getByTestId('isPlaying').props.children).toBe('true');

    await act(async () => {
      statusCallbacks[statusCallbacks.length - 1]({
        currentTime: 120,
        duration: 120,
        playing: false,
        isBuffering: false,
        didJustFinish: true,
      });
    });

    expect(getByTestId('isBuffering').props.children).toBe('true');

    await act(async () => seg1Resolve!());

    expect(getByTestId('isPlaying').props.children).toBe('true');
    expect(getByTestId('isBuffering').props.children).toBe('false');
  });

  it('ignores stale segment completions after switching stories', async () => {
    mockStreamStorySegment.mockImplementation(
      (storyId: string, segmentIndex: number, text: string) =>
        Promise.resolve({
          storyId,
          segmentIndex,
          text,
          uri: `file://seg-${storyId}-${segmentIndex}.mp3`,
        }),
    );
    mockSplitStoryIntoSegments.mockImplementation(() => ['single-segment']);

    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    expect(getByTestId('currentStory').props.children).toBe('Test Story');

    await act(async () => fireEvent.press(getByTestId('play2')));
    expect(getByTestId('currentStory').props.children).toBe('Another Story');
  });

  it('startFadeToBlack transitions phase to fade_to_black, ramps ambient volume down over 4s, then transitions to done', async () => {
    jest.useFakeTimers();
    (createAudioPlayer as jest.Mock).mockImplementation(() => mockPlayer);
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    (createAudioPlayer as jest.Mock).mockImplementation(() => mockAmbientPlayer);

    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(getByTestId('postStoryPhase').props.children).toBe('pillow_talk');
    mockAmbientPlayer.volume = 0.15;

    await act(async () => fireEvent.press(getByTestId('startFadeToBlack')));
    expect(getByTestId('postStoryPhase').props.children).toBe('fade_to_black');

    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(mockAmbientPlayer.volume).toBeLessThan(0.15);
    expect(mockAmbientPlayer.volume).toBeGreaterThan(0);
    expect(getByTestId('postStoryPhase').props.children).toBe('fade_to_black');

    await act(async () => { jest.advanceTimersByTime(2100); });
    expect(mockAmbientPlayer.volume).toBe(0);
    expect(mockAmbientRemove).toHaveBeenCalledTimes(1);
    expect(getByTestId('postStoryPhase').props.children).toBe('done');
    jest.useRealTimers();
  });

  it('stopStory during startFadeToBlack clears interval ref', async () => {
    jest.useFakeTimers();
    (createAudioPlayer as jest.Mock).mockImplementation(() => mockPlayer);
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));

    (createAudioPlayer as jest.Mock).mockImplementation(() => mockAmbientPlayer);

    await act(async () => statusCallback({
      currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true,
    }));
    await act(async () => { jest.advanceTimersByTime(3100); });
    expect(getByTestId('postStoryPhase').props.children).toBe('pillow_talk');

    await act(async () => fireEvent.press(getByTestId('startFadeToBlack')));
    expect(getByTestId('postStoryPhase').props.children).toBe('fade_to_black');

    await act(async () => fireEvent.press(getByTestId('stop')));
    expect(getByTestId('postStoryPhase').props.children).toBe('idle');

    const volBefore = mockAmbientPlayer.volume;
    await act(async () => { jest.advanceTimersByTime(4000); });
    expect(mockAmbientPlayer.volume).toBe(volBefore);
    jest.useRealTimers();
  });
});
