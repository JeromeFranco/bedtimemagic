import { render } from '@testing-library/react-native';
import { BreathingCircle } from '../breathing-circle';

describe('BreathingCircle', () => {
  it('renders with default size', async () => {
    const { getByTestId } = await render(<BreathingCircle testID="circle" />);
    const circle = getByTestId('circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 120, height: 120 }),
      ])
    );
  });

  it('renders with custom size', async () => {
    const { getByTestId } = await render(<BreathingCircle size={200} testID="circle" />);
    const circle = getByTestId('circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 200, height: 200, borderRadius: 100 }),
      ])
    );
  });

  it('renders with custom color', async () => {
    const { getByTestId } = await render(<BreathingCircle color="rgba(255,0,0,0.5)" testID="circle" />);
    const circle = getByTestId('circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: 'rgba(255,0,0,0.5)' }),
      ])
    );
  });

  it('renders with default color when color prop is not provided', async () => {
    const { getByTestId } = await render(<BreathingCircle testID="circle" />);
    const circle = getByTestId('circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: 'rgba(139, 92, 246, 0.2)' }),
      ])
    );
  });

  it('keeps shadow color fixed when custom color is provided', async () => {
    const { getByTestId } = await render(<BreathingCircle color="rgba(255,0,0,0.5)" testID="circle" />);
    const circle = getByTestId('circle');
    expect(circle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shadowColor: '#A07BD4' }),
      ])
    );
  });
});
