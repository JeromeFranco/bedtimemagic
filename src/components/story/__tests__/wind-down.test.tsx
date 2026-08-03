import { render } from '@testing-library/react-native';
import { GestureHintCue, WindDownContent } from '../wind-down';

describe('WindDown components', () => {
  describe('GestureHintCue', () => {
    it('renders swipe hint cue text for pillow_talk phase', async () => {
      const { getByText } = await render(<GestureHintCue phase="pillow_talk" />);
      expect(getByText('Swipe for Affirmation →')).toBeTruthy();
    });

    it('renders swipe hint cue text for affirmation phase', async () => {
      const { getByText } = await render(<GestureHintCue phase="affirmation" />);
      expect(getByText('Swipe for Goodnight ↑')).toBeTruthy();
    });
  });

  describe('WindDownContent', () => {
    it('renders wind-down text and breathing circle', async () => {
      const { getByText, getByTestId } = await render(
        <WindDownContent text="How was your day?" postStoryPhase="pillow_talk" />
      );
      expect(getByText('How was your day?')).toBeTruthy();
      expect(getByTestId('breathing-circle')).toBeTruthy();
    });
  });
});
