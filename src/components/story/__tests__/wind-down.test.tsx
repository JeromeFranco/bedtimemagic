import { render } from '@testing-library/react-native';

import { AffirmationContent, PillowTalkContent } from '../wind-down';

describe('WindDown content', () => {
  it('renders Pillow Talk label, prompt, and compact pacer', async () => {
    const queries = await render(<PillowTalkContent prompt="How was your day?" />);
    expect(queries.getByText('Pillow talk')).toBeTruthy();
    expect(queries.getByText('How was your day?')).toBeTruthy();
    expect(queries.getByTestId('breathing-circle').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 120, height: 120 })]),
    );
  });

  it('renders affirmation label, text, and larger pacer', async () => {
    const queries = await render(<AffirmationContent text="I am safe." />);
    expect(queries.getByText('Say together')).toBeTruthy();
    expect(queries.getByText('I am safe.')).toBeTruthy();
    expect(queries.getByTestId('breathing-circle').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 160, height: 160 })]),
    );
  });
});
