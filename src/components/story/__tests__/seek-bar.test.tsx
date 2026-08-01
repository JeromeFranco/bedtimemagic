import { render, fireEvent, cleanup, act } from '@testing-library/react-native';

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  const chainable = () => {
    const obj: Record<string, unknown> = {};
    for (const m of ['onBegin', 'onUpdate', 'onFinalize', 'onEnd', 'onStart', 'onChange']) {
      obj[m] = () => obj;
    }
    return obj;
  };
  return {
    Gesture: { Pan: chainable, Tap: chainable },
    GestureDetector: ({ children }: { children: unknown }) =>
      React.createElement(View, null, children),
  };
});

import { SeekBar } from '../seek-bar';

describe('SeekBar', () => {
  const defaultProps = {
    progress: 0.5,
    position: 30,
    duration: 60,
    onSeek: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());
  afterEach(cleanup);

  it('renders current and total time labels', async () => {
    const { getByText } = await render(<SeekBar {...defaultProps} />);
    expect(getByText('0:30')).toBeTruthy();
    expect(getByText('1:00')).toBeTruthy();
  });

  it('calls onSeek with correct seconds when track is tapped', async () => {
    const { getByTestId } = await render(<SeekBar {...defaultProps} />);
    await act(async () => {
      fireEvent(getByTestId('seek-bar-track'), 'onLayout', {
        nativeEvent: { layout: { width: 300 } },
      });
    });
    await act(async () => {
      fireEvent.press(getByTestId('seek-bar-track'), {
        nativeEvent: { locationX: 75 },
      });
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(15);
  });

  it('clamps seek to 0 when tapping before track start', async () => {
    const { getByTestId } = await render(<SeekBar {...defaultProps} />);
    await act(async () => {
      fireEvent(getByTestId('seek-bar-track'), 'onLayout', {
        nativeEvent: { layout: { width: 300 } },
      });
    });
    await act(async () => {
      fireEvent.press(getByTestId('seek-bar-track'), {
        nativeEvent: { locationX: -10 },
      });
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(0);
  });

  it('clamps seek to duration when tapping past track end', async () => {
    const { getByTestId } = await render(<SeekBar {...defaultProps} />);
    await act(async () => {
      fireEvent(getByTestId('seek-bar-track'), 'onLayout', {
        nativeEvent: { layout: { width: 300 } },
      });
    });
    await act(async () => {
      fireEvent.press(getByTestId('seek-bar-track'), {
        nativeEvent: { locationX: 400 },
      });
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(60);
  });
});
