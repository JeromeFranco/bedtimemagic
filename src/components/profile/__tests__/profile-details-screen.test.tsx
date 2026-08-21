import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileDetailsScreen } from '@/components/profile/profile-details-screen';
import { ProfileDraftProvider } from '@/contexts/ProfileDraftContext';

describe('ProfileDetailsScreen', () => {
  it('requires a valid nickname and developmental level, then normalizes', async () => {
    const onContinue = jest.fn();
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ProfileDraftProvider>
          <ProfileDetailsScreen onContinue={onContinue} />
        </ProfileDraftProvider>
      </SafeAreaProvider>,
    );

    const input = view.getByTestId('nickname-input');
    const continueButton = view.getByTestId('profile-details-continue');
    expect(continueButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(input, 'Rocket 🚀');
    await fireEvent(input, 'blur');
    await waitFor(() => {
      expect(
        view.getByText('Use letters, numbers, spaces, apostrophes, or hyphens.'),
      ).toBeTruthy();
    });

    await fireEvent.changeText(input, '  Rocket   Bear  ');
    await fireEvent.press(view.getByTestId('stage-early_primary'));
    await waitFor(() => {
      expect(view.getByTestId('profile-details-continue').props.disabled).not.toBe(true);
    });
    await fireEvent.press(view.getByTestId('profile-details-continue'));

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    expect(view.getByDisplayValue('Rocket Bear')).toBeTruthy();
  });

  it('renders the required privacy guidance and all levels', async () => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ProfileDraftProvider>
          <ProfileDetailsScreen onContinue={jest.fn()} />
        </ProfileDraftProvider>
      </SafeAreaProvider>,
    );

    expect(view.getByText('Use a nickname, not a real name.')).toBeTruthy();
    expect(view.getByText('We never ask for real names or birthdates.')).toBeTruthy();
    expect(view.getAllByRole('radio')).toHaveLength(3);
  });
});
