import { useState } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProfileDetailsScreen } from '@/components/profile/profile-details-screen';
import {
  ProtagonistSelectionScreen,
  type ProfileSubmissionInput,
} from '@/components/profile/protagonist-selection-screen';
import { ProfileDraftProvider } from '@/contexts/ProfileDraftContext';

function ProfileFlow({
  onSubmit,
}: {
  onSubmit: (input: ProfileSubmissionInput) => Promise<void>;
}) {
  const [showProtagonists, setShowProtagonists] = useState(false);
  return showProtagonists ? (
    <ProtagonistSelectionScreen onSubmit={onSubmit} />
  ) : (
    <ProfileDetailsScreen onContinue={() => setShowProtagonists(true)} />
  );
}

async function openProtagonistScreen(
  onSubmit: (input: ProfileSubmissionInput) => Promise<void>,
) {
  const view = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ProfileDraftProvider>
        <ProfileFlow onSubmit={onSubmit} />
      </ProfileDraftProvider>
    </SafeAreaProvider>,
  );
  await fireEvent.changeText(view.getByTestId('nickname-input'), '  Rocket   Bear ');
  await fireEvent.press(view.getByTestId('stage-older_kids'));
  await waitFor(() => {
    expect(view.getByTestId('profile-details-continue').props.disabled).not.toBe(true);
  });
  await fireEvent.press(view.getByTestId('profile-details-continue'));
  await waitFor(() => expect(view.getAllByRole('radio')).toHaveLength(5));
  return view;
}

describe('ProtagonistSelectionScreen', () => {
  it('requires an explicit choice and submits the normalized draft once', async () => {
    const pendingSubmission = Promise.withResolvers<void>();
    const onSubmit = jest.fn(() => pendingSubmission.promise);
    const view = await openProtagonistScreen(onSubmit);

    expect(view.getAllByRole('radio')).toHaveLength(5);
    expect(view.getByTestId('profile-submit').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(view.getByTestId('protagonist-rex'));
    await waitFor(() => {
      expect(view.getByTestId('profile-submit').props.disabled).not.toBe(true);
    });
    await fireEvent.press(view.getByTestId('profile-submit'));
    await fireEvent.press(view.getByTestId('profile-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      nickname: 'Rocket Bear',
      developmentalStage: 'older_kids',
      protagonist: 'rex',
    });
    expect(view.getByText('Saving…')).toBeTruthy();

    await act(async () => pendingSubmission.resolve());
  });

  it('retains the draft and permits retry after a failure', async () => {
    const onSubmit = jest
      .fn<Promise<void>, [ProfileSubmissionInput]>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce();
    const view = await openProtagonistScreen(onSubmit);

    await fireEvent.press(view.getByTestId('protagonist-barnaby'));
    await waitFor(() => {
      expect(view.getByTestId('profile-submit').props.disabled).not.toBe(true);
    });
    await fireEvent.press(view.getByTestId('profile-submit'));

    await waitFor(() => {
      expect(view.getByText("We couldn't save this profile. Try again.")).toBeTruthy();
    });
    expect(view.getByText('Barnaby')).toBeTruthy();

    await fireEvent.press(view.getByTestId('profile-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  });
});
