## Rules

- Use conventional commit for commit message
- When proposing a fix, state a confidence level (low/medium/high) and briefly explain the evidence supporting it.
- Prefer idiomatic, framework-supported solutions; explicitly evaluate whether the approach is optimal and avoid monkey patches, test-only behavior changes, or suppressions unless justified and approved.
- Use expo-ui skill when working with expo ui components and prefer universal components over jetpack-compose and swiftui
- Run `npm run lint` and `npm run typecheck` after every code change and fix any errors before committing
- When using react-native-reanimated (React Compiler is enabled), always read/write shared values via `.get()`/`.set()` methods — never access `.value` directly (triggers the "Reading from `value` during component render" warning)
- React Compiler is enabled: skip `useMemo`, and skip `useCallback` unless function identity must be stable — e.g. when the function is a `useEffect` dependency (the compiler does NOT memoize effect-dep functions)
- Never suppress lint rules (`// eslint-disable`, `// @ts-ignore`); `react-hooks/*` disables inside a component are a hard no — React Compiler detects them and skips optimizing the entire component. For any other suppression, explain the tradeoff and ask permission first, especially when fixing adds complexity without enough benefit.
