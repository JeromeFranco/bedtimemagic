import { render, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBarScrim } from '../status-bar-scrim';
import { useTopChromeInset } from '../use-top-chrome-inset';
import { Colors, Layout, Spacing } from '@/theme';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'ExpoLinearGradient' }));

function safeAreaWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>
  );
}

describe('StatusBarScrim', () => {
  it('renders a non-interactive, decorative gradient from the named chrome tokens', async () => {
    const view = await render(<StatusBarScrim height={91} />);
    const scrim = view.getByTestId('status-bar-scrim');

    expect(scrim.props.colors).toEqual([
      Colors.dark.systemBarScrimTop,
      Colors.dark.systemBarScrimBottom,
    ]);
    expect(scrim.props.pointerEvents).toBe('none');
    expect(scrim.props.accessible).toBe(false);
    expect(scrim.props.accessibilityRole).toBeUndefined();
    expect(scrim.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ bottom: undefined }),
      expect.objectContaining({ height: 91 + Spacing.xl }),
    ]));
  });
});

describe('useTopChromeInset', () => {
  const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS')!;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', platformDescriptor);
  });

  it('uses the safe-area status height for a headerless root', async () => {
    const { result } = await renderHook(() => useTopChromeInset({ hasNativeHeader: false }), {
      wrapper: safeAreaWrapper,
    });

    expect(result.current).toBe(47);
  });

  it('adds the token-composed Android native header height', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const { result } = await renderHook(() => useTopChromeInset({ hasNativeHeader: true }), {
      wrapper: safeAreaWrapper,
    });

    expect(result.current).toBe(47 + Layout.minTouchTarget + Spacing.md);
  });
});
