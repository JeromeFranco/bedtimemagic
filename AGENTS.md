## Tech Stack

- **Framework:** Expo SDK 56, React Native 0.85, React 19
- **UI:** @expo/ui + React Native StyleSheet
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **State:** @tanstack/react-query (server), React Context
- **AI (LLM):** `@ai-sdk/openai-compatible` → MiMo V2.5 Pro (`https://api.xiaomimimo.com/v1`, header: `api-key`)
- **AI (TTS):** `openai` package → MiMo V2.5 TTS (same endpoint, audio output)
- **AI (Image):** `@ai-sdk/google` → bfl/flux (watercolor covers)
- **Audio:** expo-audio (background playback)
- **Monetization:** RevenueCat (V1.1 for consumables)
- **Animations:** react-native-reanimated

## NON-NEGOTIABLE RULES

1. Do not modify source code before completing discovery, declaring scope, and receiving execution approval.
2. Modify only files listed in the approved write allowlist.
3. Treat every other repository file as read-only.
4. Never add, remove, or upgrade dependencies without explicit approval.
5. Never claim a command, build, test, lint, or check passed unless it was executed and returned exit code 0.
6. Never invent command output, repository contents, APIs, dependencies, test data, credentials, or completion evidence.
7. If required information is missing, stop and report the blocker. Do not manufacture a substitute.
8. Never discard, overwrite, or revert user changes. Do not use destructive Git commands.
9. After two failed attempts using substantially the same approach, stop and request guidance.
10. During tool execution, emit no conversational transitions such as “I will now...” or “Next I’ll...”. Call tools directly.

These rules override convenience, speed, inferred intent, and pressure to finish.

## Other Rules

- Use conventional commit for commit message
- Use expo-ui skill when working with expo ui components and prefer universal components over jetpack-compose and swiftui
- Use ai-sdk skill when working with ai sdk
- Run `npm run lint` and `npm run typecheck` after every code change and fix any errors before committing
- When using react-native-reanimated (React Compiler is enabled), always read/write shared values via `.get()`/`.set()` methods — never access `.value` directly (triggers the "Reading from `value` during component render" warning)
- Never suppress lint rules (`// eslint-disable`, `// @ts-ignore`) without asking permission first. If you assess that fixing the issue adds complexity without enough benefit, explain the tradeoff and ask before suppressing.
