import { render, fireEvent, cleanup, act } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';

import { SeekBar } from '../seek-bar';

// PanResponder's grant/move wrappers read `event.touchHistory` (maintained by
// the live ResponderSystem, absent under fireEvent). Provide a minimal
// single-touch history so the wrappers compute a gestureState without crashing.
const touchHistory = (overrides: Record<string, unknown> = {}) => ({
  numberActiveTouches: 1,
  indexOfSingleActiveTouch: 0,
  mostRecentTimeStamp: 1,
  touchBank: [
    {
      touchActive: true,
      currentTimeStamp: 1,
      currentPageX: 0,
      currentPageY: 0,
      previousPageX: 0,
      previousPageY: 0,
    },
  ],
  ...overrides,
});

const gestureState = (overrides: Record<string, number> = {}) => ({
  stateID: 1,
  moveX: 0,
  moveY: 0,
  x0: 0,
  y0: 0,
  dx: 0,
  dy: 0,
  vx: 0,
  vy: 0,
  numberActiveTouches: 1,
  _accountsForMovesUpTo: 0,
  ...overrides,
});

const makeEvent = (locationX: number) => ({
  nativeEvent: { locationX, pageX: locationX },
  touchHistory: touchHistory(),
});

const layoutTrack = (track: TestInstance, width: number) =>
  fireEvent(track, 'onLayout', { nativeEvent: { layout: { width } } });

const grantTrack = (track: TestInstance, locationX: number) =>
  fireEvent(track, 'onResponderGrant', makeEvent(locationX), gestureState());

const moveTrack = (track: TestInstance, locationX: number, dx: number) =>
  fireEvent(
    track,
    'onResponderMove',
    makeEvent(locationX),
    gestureState({ dx, moveX: locationX }),
  );

const releaseTrack = (track: TestInstance, locationX: number) =>
  fireEvent(track, 'onResponderRelease', makeEvent(locationX), gestureState());

const tapTrack = (track: TestInstance, locationX: number) =>
  grantTrack(track, locationX).then(() => releaseTrack(track, locationX));

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
    const track = getByTestId('seek-bar-track');
    await act(async () => {
      await layoutTrack(track, 300);
    });
    await act(async () => {
      await tapTrack(track, 75);
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(15);
  });

  it('clamps seek to 0 when tapping before track start', async () => {
    const { getByTestId } = await render(<SeekBar {...defaultProps} />);
    const track = getByTestId('seek-bar-track');
    await act(async () => {
      await layoutTrack(track, 300);
    });
    await act(async () => {
      await tapTrack(track, -10);
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(0);
  });

  it('clamps seek to duration when tapping past track end', async () => {
    const { getByTestId } = await render(<SeekBar {...defaultProps} />);
    const track = getByTestId('seek-bar-track');
    await act(async () => {
      await layoutTrack(track, 300);
    });
    await act(async () => {
      await tapTrack(track, 400);
    });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(60);
  });

  it('calls onSeek continuously while dragging the thumb', async () => {
    const onSeek = jest.fn();
    const { getByTestId } = await render(
      <SeekBar progress={0} position={0} duration={60} onSeek={onSeek} />,
    );
    const track = getByTestId('seek-bar-track');
    await act(async () => {
      await layoutTrack(track, 300);
    });
    await act(async () => {
      await grantTrack(track, 0);
    });
    await act(async () => {
      await moveTrack(track, 150, 150);
    });
    await act(async () => {
      await releaseTrack(track, 150);
    });
    expect(onSeek).toHaveBeenCalledWith(30);
  });
});
