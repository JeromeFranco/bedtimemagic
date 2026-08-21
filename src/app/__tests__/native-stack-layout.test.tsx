import { fireEvent, render } from '@testing-library/react-native';

import Layout from '../(app)/(index,vault)/_layout';
import { router } from 'expo-router';
import { Colors } from '@/theme';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

jest.mock('expo-router/stack', () => {
  const Stack = ({ children }: { children: React.ReactNode }) => children;
  Stack.Screen = jest.fn(() => null);
  return { __esModule: true, default: Stack };
});

const mockStackScreen = (jest.requireMock('expo-router/stack') as {
  default: { Screen: jest.Mock };
}).default.Screen;

describe('native stack layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses transparent native chrome and a circular Create Back item', async () => {
    await render(<Layout segment="(index,vault)" />);
    const createScreen = mockStackScreen.mock.calls.find(([props]) => props.name === 'create')![0];

    expect(createScreen.options).toMatchObject({
      headerShown: true,
      headerTransparent: true,
      headerShadowVisible: false,
      headerTintColor: Colors.dark.textPrimary,
      headerBackVisible: false,
    });
    const header = await render(createScreen.options.headerLeft());
    await fireEvent.press(header.getByLabelText('Go back'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
