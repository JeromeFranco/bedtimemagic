import { render, fireEvent } from '@testing-library/react-native';
import { Affirmation } from '../affirmation';

describe('Affirmation', () => {
  const defaultProps = {
    text: 'I am brave and kind.',
    onConfirm: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders affirmation text', async () => {
    const { getByText } = await render(<Affirmation {...defaultProps} />);
    expect(getByText('I am brave and kind.')).toBeTruthy();
  });

  it('renders Goodnight button', async () => {
    const { getByText } = await render(<Affirmation {...defaultProps} />);
    expect(getByText('Goodnight')).toBeTruthy();
  });

  it('calls onConfirm when Goodnight is pressed', async () => {
    const { getByText } = await render(<Affirmation {...defaultProps} />);
    fireEvent.press(getByText('Goodnight'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders breathing circle', async () => {
    const { getByTestId } = await render(<Affirmation {...defaultProps} />);
    expect(getByTestId('breathing-circle')).toBeTruthy();
  });
});
