import { render } from '@testing-library/react-native';

import AddProfileProtagonistRoute from '../(app)/(index,vault)/profile/protagonist';
import type { ProfileSubmissionInput } from '@/components/profile/protagonist-selection-screen';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { router } from 'expo-router';

const mockCreateProfile = jest.fn();
let mockRouteSubmit: ((input: ProfileSubmissionInput) => Promise<void>) | undefined;

jest.mock('expo-router', () => ({
  router: { dismissTo: jest.fn() },
}));
jest.mock('@/contexts/SelectedChildContext', () => ({
  useSelectedChild: jest.fn(),
}));
jest.mock('@/components/profile/protagonist-selection-screen', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    ProtagonistSelectionScreen: ({
      onSubmit,
    }: {
      onSubmit: (input: ProfileSubmissionInput) => Promise<void>;
    }) => {
      mockRouteSubmit = onSubmit;
      return React.createElement(Text, null, 'add profile route');
    },
  };
});

const mockUseSelectedChild = useSelectedChild as jest.MockedFunction<typeof useSelectedChild>;
const input: ProfileSubmissionInput = {
  nickname: 'Rocket',
  developmentalStage: 'older_kids',
  protagonist: 'rex',
};

describe('add profile route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteSubmit = undefined;
    mockUseSelectedChild.mockReturnValue({ createProfile: mockCreateProfile } as never);
  });

  it('creates and selects once before dismissing the flow to Home', async () => {
    mockCreateProfile.mockResolvedValue({ id: 'created' });
    await render(<AddProfileProtagonistRoute />);

    await mockRouteSubmit?.(input);

    expect(mockCreateProfile).toHaveBeenCalledTimes(1);
    expect(mockCreateProfile).toHaveBeenCalledWith(input);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('does not dismiss when remote creation fails', async () => {
    mockCreateProfile.mockRejectedValue(new Error('offline'));
    await render(<AddProfileProtagonistRoute />);

    await expect(mockRouteSubmit?.(input)).rejects.toThrow('offline');
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});
