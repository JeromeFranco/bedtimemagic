import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

type Status = {
  currentIndex: number;
  trackCount: number;
  currentTime: number;
  duration: number;
  playing: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
};

type MockPlaylist = ReturnType<typeof makePlaylist>;

const playlistInstances: MockPlaylist[] = [];
const mockCreateAudioPlaylist = jest.fn((_options?: unknown) => {
  const playlist = makePlaylist();
  playlistInstances.push(playlist);
  return playlist;
});
const mockSetAudioModeAsync = jest.fn((_mode?: unknown) => Promise.resolve());
const mockAmbientPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  volume: 0,
  loop: false,
};
const mockCreateAudioPlayer = jest.fn((_source?: unknown) => mockAmbientPlayer);

function makePlaylist() {
  let statusListener: ((status: Status) => void) | undefined;
  const playlist = {
    currentIndex: 0,
    trackCount: 1,
    volume: 1,
    play: jest.fn(),
    pause: jest.fn(),
    next: jest.fn(() => {
      playlist.currentIndex = Math.min(playlist.currentIndex + 1, playlist.trackCount - 1);
    }),
    skipTo: jest.fn((index: number) => {
      playlist.currentIndex = index;
    }),
    seekTo: jest.fn((_seconds: number) => Promise.resolve()),
    add: jest.fn(() => {
      playlist.trackCount += 1;
    }),
    destroy: jest.fn(),
    addListener: jest.fn((_event: string, listener: (status: Status) => void) => {
      statusListener = listener;
      return { remove: jest.fn() };
    }),
    emit(overrides: Partial<Status> = {}) {
      statusListener?.({
        currentIndex: playlist.currentIndex,
        trackCount: playlist.trackCount,
        currentTime: 0,
        duration: 0,
        playing: false,
        isBuffering: false,
        didJustFinish: false,
        ...overrides,
      });
    },
  };
  return playlist;
}

jest.mock('expo-audio', () => ({
  createAudioPlaylist: (options: unknown) => mockCreateAudioPlaylist(options),
  createAudioPlayer: (source: unknown) => mockCreateAudioPlayer(source),
  setAudioModeAsync: (mode: unknown) => mockSetAudioModeAsync(mode),
}));

const mockStreamStorySegment = jest.fn();
const mockCancelStoryAudio = jest.fn();
const mockSplitStoryIntoSegments = jest.fn((text: string) => [text]);

jest.mock('@/lib/inworld-tts', () => ({
  streamStorySegment: (...args: [string, number, string]) => mockStreamStorySegment(...args),
  cancelStoryAudio: (...args: [string]) => mockCancelStoryAudio(...args),
}));

jest.mock('@/lib/story-segments', () => ({
  splitStoryIntoSegments: (...args: [string]) => mockSplitStoryIntoSegments(...args),
}));

jest.mock('@/lib/audio-utils', () => ({
  getAmbientAudioSource: jest.fn(() => 'ambient-rain'),
}));

import type { Story } from '@/types';
import { PlayerProvider, usePlayer } from '../PlayerContext';

const STORY: Story = {
  id: 'story-1',
  user_id: 'user-1',
  child_id: 'child-1',
  title: 'Test Story',
  story_text: 'Once upon a time...',
  moral: 'Be kind.',
  pillow_talk_prompt: 'What was your favorite part?',
  sleepy_affirmation: 'I am safe.',
  cover_image_url: null,
  challenge: 'refusing_teeth',
  protagonist: 'barnaby',
  created_at: '2026-06-21T00:00:00Z',
};

const STORY_TWO: Story = { ...STORY, id: 'story-2', title: 'Second Story' };

function TestComponent() {
  const player = usePlayer();
  return (
    <View>
      <Text testID="story">{player.currentStory?.title ?? 'none'}</Text>
      <Text testID="playing">{String(player.isPlaying)}</Text>
      <Text testID="buffering">{String(player.isBuffering)}</Text>
      <Text testID="position">{String(player.position)}</Text>
      <Text testID="duration">{String(player.duration)}</Text>
      <Text testID="phase">{player.postStoryPhase}</Text>
      <Pressable testID="play" onPress={() => player.playStory(STORY)} />
      <Pressable testID="playTwo" onPress={() => player.playStory(STORY_TWO)} />
      <Pressable testID="pause" onPress={player.pause} />
      <Pressable testID="resume" onPress={player.resume} />
      <Pressable testID="seek" onPress={() => player.seekTo(40.5)} />
      <Pressable testID="stop" onPress={player.stopStory} />
      <Pressable testID="skip" onPress={player.skipPillowTalk} />
      <Pressable testID="confirm" onPress={player.confirmAffirmation} />
    </View>
  );
}

function renderPlayer() {
  return render(
    <PlayerProvider>
      <TestComponent />
    </PlayerProvider>,
  );
}

function segment(storyId: string, segmentIndex: number, text: string) {
  return {
    storyId,
    segmentIndex,
    text,
    uri: `file://${storyId}-${segmentIndex}.mp3`,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('PlayerContext playlist playback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    playlistInstances.length = 0;
    mockAmbientPlayer.volume = 0;
    mockAmbientPlayer.loop = false;
    mockSplitStoryIntoSegments.mockImplementation((text: string) => [text]);
    mockStreamStorySegment.mockImplementation(
      async (storyId: string, segmentIndex: number, text: string) =>
        segment(storyId, segmentIndex, text),
    );
  });

  it('starts one playlist per story with the completed first segment', async () => {
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));

    expect(mockCreateAudioPlaylist).toHaveBeenCalledWith({
      sources: [{ uri: 'file://story-1-0.mp3' }],
      loop: 'none',
      updateInterval: 250,
    });
    expect(mockCreateAudioPlaylist).toHaveBeenCalledTimes(1);
    expect(playlistInstances[0].play).toHaveBeenCalledTimes(1);
    expect(playlistInstances[0].addListener).toHaveBeenCalledWith(
      'playlistStatusUpdate',
      expect.any(Function),
    );
    expect(view.getByTestId('story').props.children).toBe('Test Story');
    expect(view.getByTestId('playing').props.children).toBe('true');
  });

  it('configures background playback before creating the playlist', async () => {
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    expect(mockSetAudioModeAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockCreateAudioPlaylist.mock.invocationCallOrder[0],
    );
  });

  it('generates sequentially and appends generated or cached segment URIs in order', async () => {
    mockSplitStoryIntoSegments.mockReturnValue(['zero', 'one', 'two']);
    const second = deferred<ReturnType<typeof segment>>();
    mockStreamStorySegment.mockImplementation(
      (storyId: string, index: number, text: string) =>
        index === 1 ? second.promise : Promise.resolve(segment(storyId, index, text)),
    );
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));

    expect(mockStreamStorySegment).toHaveBeenCalledTimes(2);
    expect(mockStreamStorySegment).not.toHaveBeenCalledWith('story-1', 2, 'two');

    await act(async () => second.resolve(segment('story-1', 1, 'one')));

    expect(playlistInstances[0].add.mock.calls).toEqual([
      [{ uri: 'file://story-1-1.mp3' }],
      [{ uri: 'file://story-1-2.mp3' }],
    ]);
    expect(mockStreamStorySegment.mock.calls.map((call) => call[1])).toEqual([0, 1, 2]);
  });

  it('uses native track progression and reports cumulative position', async () => {
    mockSplitStoryIntoSegments.mockReturnValue(['zero', 'one'.repeat(10)]);
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    const playlist = playlistInstances[0];

    await act(async () => playlist.emit({ currentIndex: 0, currentTime: 40, duration: 40 }));
    playlist.currentIndex = 1;
    await act(async () =>
      playlist.emit({ currentIndex: 1, currentTime: 5, duration: 30, playing: true }),
    );

    expect(playlist.next).not.toHaveBeenCalled();
    expect(Number(view.getByTestId('position').props.children)).toBe(45);
    expect(Number(view.getByTestId('duration').props.children)).toBe(70);
  });

  it('buffers on generation underrun and resumes when the next track arrives', async () => {
    mockSplitStoryIntoSegments.mockReturnValue(['zero', 'one']);
    const second = deferred<ReturnType<typeof segment>>();
    mockStreamStorySegment.mockImplementation(
      (storyId: string, index: number, text: string) =>
        index === 1 ? second.promise : Promise.resolve(segment(storyId, index, text)),
    );
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    const playlist = playlistInstances[0];

    await act(async () => playlist.emit({ didJustFinish: true, duration: 40, currentTime: 40 }));
    expect(view.getByTestId('buffering').props.children).toBe('true');
    expect(view.getByTestId('playing').props.children).toBe('false');

    await act(async () => second.resolve(segment('story-1', 1, 'one')));
    expect(playlist.next).toHaveBeenCalledTimes(1);
    expect(playlist.play).toHaveBeenCalledTimes(2);
    expect(view.getByTestId('buffering').props.children).toBe('false');
    expect(view.getByTestId('playing').props.children).toBe('true');
  });

  it('does not auto-resume after a parent pauses during an underrun', async () => {
    mockSplitStoryIntoSegments.mockReturnValue(['zero', 'one']);
    const second = deferred<ReturnType<typeof segment>>();
    mockStreamStorySegment.mockImplementation(
      (storyId: string, index: number, text: string) =>
        index === 1 ? second.promise : Promise.resolve(segment(storyId, index, text)),
    );
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    const playlist = playlistInstances[0];
    await act(async () => playlist.emit({ didJustFinish: true }));
    await act(async () => fireEvent.press(view.getByTestId('pause')));

    await act(async () => second.resolve(segment('story-1', 1, 'one')));
    expect(playlist.next).not.toHaveBeenCalled();
    expect(playlist.play).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('playing').props.children).toBe('false');
  });

  it('keeps buffering instead of replaying the finished track when resumed before generation', async () => {
    mockSplitStoryIntoSegments.mockReturnValue(['zero', 'one']);
    const second = deferred<ReturnType<typeof segment>>();
    mockStreamStorySegment.mockImplementation(
      (storyId: string, index: number, text: string) =>
        index === 1 ? second.promise : Promise.resolve(segment(storyId, index, text)),
    );
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    const playlist = playlistInstances[0];
    await act(async () => playlist.emit({ didJustFinish: true }));
    await act(async () => fireEvent.press(view.getByTestId('resume')));

    expect(playlist.play).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('buffering').props.children).toBe('true');
    expect(view.getByTestId('playing').props.children).toBe('false');

    await act(async () => second.resolve(segment('story-1', 1, 'one')));
    expect(playlist.next).toHaveBeenCalledTimes(1);
    expect(playlist.play).toHaveBeenCalledTimes(2);
  });

  it('seeks across known segment durations using playlist track indexes', async () => {
    mockSplitStoryIntoSegments.mockReturnValue(['zero', 'one'.repeat(10)]);
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    const playlist = playlistInstances[0];
    await act(async () => playlist.emit({ currentIndex: 0, duration: 40, currentTime: 10 }));

    await act(async () => fireEvent.press(view.getByTestId('seek')));
    expect(playlist.skipTo).toHaveBeenCalledWith(1);
    expect(playlist.seekTo.mock.calls[0][0]).toBeCloseTo(0.5, 5);
    expect(Number(view.getByTestId('position').props.children)).toBe(40.5);
  });

  it('keeps a pending seek paused until its target segment is generated', async () => {
    mockSplitStoryIntoSegments.mockReturnValue(['a'.repeat(572), 'one'.repeat(10)]);
    const second = deferred<ReturnType<typeof segment>>();
    mockStreamStorySegment.mockImplementation(
      (storyId: string, index: number, text: string) =>
        index === 1 ? second.promise : Promise.resolve(segment(storyId, index, text)),
    );
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    const playlist = playlistInstances[0];
    await act(async () => fireEvent.press(view.getByTestId('seek')));
    expect(playlist.pause).toHaveBeenCalled();
    expect(view.getByTestId('buffering').props.children).toBe('true');

    await act(async () => second.resolve(segment('story-1', 1, 'one')));
    expect(playlist.skipTo).toHaveBeenCalledWith(1);
    expect(playlist.seekTo.mock.calls[0][0]).toBeCloseTo(0.46, 5);
    expect(playlist.play).toHaveBeenCalledTimes(2);
  });

  it('cancels and destroys playback on stop and unmount', async () => {
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    const firstPlaylist = playlistInstances[0];
    await act(async () => fireEvent.press(view.getByTestId('stop')));

    expect(mockCancelStoryAudio).toHaveBeenCalledWith('story-1');
    expect(firstPlaylist.pause).toHaveBeenCalled();
    expect(firstPlaylist.destroy).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('story').props.children).toBe('none');

    await act(async () => fireEvent.press(view.getByTestId('play')));
    const secondPlaylist = playlistInstances[1];
    await view.unmount();
    expect(secondPlaylist.destroy).toHaveBeenCalledTimes(1);
  });

  it('rejects stale later-segment completion after switching stories', async () => {
    mockSplitStoryIntoSegments.mockReturnValue(['zero', 'one']);
    const staleSecond = deferred<ReturnType<typeof segment>>();
    mockStreamStorySegment.mockImplementation((storyId: string, index: number, text: string) => {
      if (storyId === 'story-1' && index === 1) return staleSecond.promise;
      return Promise.resolve(segment(storyId, index, text));
    });
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    await act(async () => fireEvent.press(view.getByTestId('playTwo')));
    expect(view.getByTestId('story').props.children).toBe('Second Story');

    await act(async () => staleSecond.resolve(segment('story-1', 1, 'one')));
    expect(mockCreateAudioPlaylist).toHaveBeenCalledTimes(2);
    expect(playlistInstances[0].add).not.toHaveBeenCalled();
    expect(view.getByTestId('story').props.children).toBe('Second Story');
    expect(mockCancelStoryAudio).toHaveBeenCalledWith('story-1');
  });

  it('allows retry after initial generation failure', async () => {
    mockStreamStorySegment.mockRejectedValueOnce(new Error('network'));
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    expect(mockCreateAudioPlaylist).not.toHaveBeenCalled();
    expect(view.getByTestId('playing').props.children).toBe('false');

    await act(async () => fireEvent.press(view.getByTestId('play')));
    expect(mockCreateAudioPlaylist).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('playing').props.children).toBe('true');
  });

  it('enters the post-story flow exactly once after the final track', async () => {
    jest.useFakeTimers();
    const view = await renderPlayer();
    await act(async () => fireEvent.press(view.getByTestId('play')));
    const playlist = playlistInstances[0];

    await act(async () => {
      playlist.emit({ didJustFinish: true, duration: 40, currentTime: 40 });
      playlist.emit({ didJustFinish: true, duration: 40, currentTime: 40 });
    });
    expect(view.getByTestId('phase').props.children).toBe('fading');
    await act(async () => jest.advanceTimersByTime(3100));

    expect(playlist.destroy).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockCreateAudioPlayer).toHaveBeenCalledWith('ambient-rain');
    expect(view.getByTestId('phase').props.children).toBe('pillow_talk');

    await act(async () => fireEvent.press(view.getByTestId('skip')));
    expect(mockAmbientPlayer.remove).toHaveBeenCalled();
    expect(view.getByTestId('phase').props.children).toBe('affirmation');
    await act(async () => fireEvent.press(view.getByTestId('confirm')));
    expect(view.getByTestId('phase').props.children).toBe('done');
  });
});
