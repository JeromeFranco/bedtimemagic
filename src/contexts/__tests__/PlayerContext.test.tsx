import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Text, Pressable, View } from 'react-native';

const mockAddListener = jest.fn();
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockSeekTo = jest.fn();
const mockRemove = jest.fn();

const mockPlayer = {
  play: mockPlay,
  pause: mockPause,
  seekTo: mockSeekTo,
  remove: mockRemove,
  addListener: mockAddListener,
};

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/audio-utils', () => ({
  getAudioSource: jest.fn(() => ({ uri: 42 })),
}));

import { PlayerProvider, usePlayer } from '../PlayerContext';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAudioSource } from '@/lib/audio-utils';
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

function TestComponent() {
  const {
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
  } = usePlayer();

  return (
    <View>
      <Text testID="currentStory">{currentStory?.title ?? 'none'}</Text>
      <Text testID="isPlaying">{String(isPlaying)}</Text>
      <Text testID="isBuffering">{String(isBuffering)}</Text>
      <Text testID="isSleepMode">{String(isSleepMode)}</Text>
      <Text testID="position">{String(position)}</Text>
      <Text testID="duration">{String(duration)}</Text>
      <Pressable testID="play" onPress={() => playStory(MOCK_STORY)} />
      <Pressable testID="play2" onPress={() => playStory(MOCK_STORY_2)} />
      <Pressable testID="pause" onPress={pause} />
      <Pressable testID="resume" onPress={resume} />
      <Pressable testID="seek" onPress={() => seekTo(30)} />
      <Pressable testID="stop" onPress={stopStory} />
      <Pressable testID="toggleSleep" onPress={toggleSleepMode} />
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
    expect(getAudioSource).toHaveBeenCalledWith(MOCK_STORY);
    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: 42 });
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

  it('seekTo seeks to position', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => fireEvent.press(getByTestId('seek')));
    expect(mockSeekTo).toHaveBeenCalledWith(30);
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

  it('didJustFinish clears playback state', async () => {
    const { getByTestId } = await renderProvider();
    await act(async () => fireEvent.press(getByTestId('play')));
    await act(async () => statusCallback({ currentTime: 120, duration: 120, playing: false, isBuffering: false, didJustFinish: true }));
    expect(getByTestId('isPlaying').props.children).toBe('false');
    expect(getByTestId('currentStory').props.children).toBe('none');
    expect(mockRemove).toHaveBeenCalled();
  });
});
