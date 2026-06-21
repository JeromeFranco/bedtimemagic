jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, Animated: AnimatedRN } = require('react-native');

  const NOOP = () => {};
  const ID = (t) => t;
  const IMMEDIATE_CALLBACK_INVOCATION = (callback) => callback();

  const Animated = {
    View,
    Text,
    Image,
    ScrollView: AnimatedRN.ScrollView,
    FlatList: AnimatedRN.FlatList,
    createAnimatedComponent: ID,
  };

  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (init) => {
      const value = { value: init };
      return new Proxy(value, {
        get(target, prop) {
          if (prop === 'value') return target.value;
          if (prop === 'get') return () => target.value;
          if (prop === 'set') return (newValue) => {
            target.value = typeof newValue === 'function' ? newValue(target.value) : newValue;
          };
        },
        set(target, prop, newValue) {
          if (prop === 'value') { target.value = newValue; return true; }
          return false;
        },
      });
    },
    useAnimatedStyle: IMMEDIATE_CALLBACK_INVOCATION,
    useAnimatedProps: IMMEDIATE_CALLBACK_INVOCATION,
    useDerivedValue: (processor) => {
      const result = processor();
      return { value: result, get: () => result };
    },
    useAnimatedRef: () => ({ current: null }),
    useAnimatedScrollHandler: () => NOOP,
    useAnimatedReaction: NOOP,
    useAnimatedKeyboard: () => ({ height: 0, state: 0 }),
    useScrollViewOffset: () => ({ value: 0 }),
    useScrollOffset: () => ({ value: 0 }),
    cancelAnimation: NOOP,
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withRepeat: ID,
    withDelay: (_delay, next) => next,
    withSequence: () => 0,
    withDecay: () => 0,
    runOnJS: ID,
    runOnUI: ID,
    makeMutable: ID,
    enableLayoutAnimations: NOOP,
    Extrapolation: { LEFT: 1, RIGHT: 2, CLAMP: 'clamp', EXTEND: 'extend' },
    Easing: {
      linear: ID,
      ease: ID,
      quad: ID,
      cubic: ID,
      in: ID,
      out: ID,
      inOut: ID,
      bezier: () => ({ factory: ID }),
    },
    processColor: (c) => c,
    interpolate: NOOP,
    interpolateColor: NOOP,
    clamp: NOOP,
    measure: () => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }),
    scrollTo: NOOP,
    BaseAnimationBuilder: { duration() { return this; }, delay() { return this; } },
    Keyframe: class { },
    ReduceMotion: { System: 0, Always: 1, Never: 2 },
    SensorType: {},
    IOSReferenceFrame: {},
    InterfaceOrientation: {},
    KeyboardState: {},
  };
});
