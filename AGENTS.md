## Rules

- When proposing a fix, state a confidence level (low/medium/high) and briefly explain the evidence supporting it.
- Prefer idiomatic, framework-supported solutions; explicitly evaluate whether the approach is optimal and avoid monkey patches, test-only behavior changes, or suppressions unless justified and approved.
- Use expo-ui skill when working with expo ui components and prefer universal components over jetpack-compose and swiftui
- Run `npm run lint` and `npm run typecheck` after every code change and fix any errors before committing
- When using react-native-reanimated (React Compiler is enabled), always read/write shared values via `.get()`/`.set()` methods — never access `.value` directly (triggers the "Reading from `value` during component render" warning)
- React Compiler is enabled: skip `useMemo`, and skip `useCallback` unless function identity must be stable — e.g. when the function is a `useEffect` dependency (the compiler does NOT memoize effect-dep functions)
- Never suppress lint rules (`// eslint-disable`, `// @ts-ignore`); `react-hooks/*` disables inside a component are a hard no — React Compiler detects them and skips optimizing the entire component. For any other suppression, explain the tradeoff and ask permission first, especially when fixing adds complexity without enough benefit.

## Design system (DESIGN.md)

- Before creating or modifying UI — screens, components, styling, animations, or design tokens — read `DESIGN.md` (repo root). Its YAML front matter holds the normative tokens; `src/theme/*` is the implementation.
- Never hardcode colors, spacing, radii, or type values; always use tokens from `@/theme`.
- When a change intentionally alters visual design (new token, palette change, new component pattern, motion change), update `DESIGN.md` in the same change — YAML tokens and `src/theme/*` must never drift.
- On conflict between `DESIGN.md` and code, surface the discrepancy to the user before choosing; do not silently follow one.
