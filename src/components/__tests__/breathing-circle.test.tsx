import { render } from '@testing-library/react-native';
import { useReducedMotion, withRepeat } from 'react-native-reanimated';

import { BreathingCircle } from '../breathing-circle';

const mockUseReducedMotion = useReducedMotion as jest.Mock;
const mockWithRepeat = withRepeat as jest.Mock;

describe('BreathingCircle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders with default size and bedtime tint', async () => {
    const { getByTestId } = await render(<BreathingCircle testID="circle" />);
    expect(getByTestId('circle').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 120, height: 120, backgroundColor: 'rgba(139, 92, 246, 0.2)' }),
      ]),
    );
  });

  it('renders with custom size and color', async () => {
    const { getByTestId } = await render(
      <BreathingCircle size={200} color="rgba(255,0,0,0.5)" testID="circle" />,
    );
    expect(getByTestId('circle').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,0,0,0.5)' }),
      ]),
    );
  });

  it('is static under reduced motion without starting repeated animation', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { getByTestId } = await render(<BreathingCircle testID="circle" />);
    expect(mockWithRepeat).not.toHaveBeenCalled();
    expect(getByTestId('circle').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ transform: [{ scale: 1 }], opacity: 0.3 })]),
    );
  });
});
