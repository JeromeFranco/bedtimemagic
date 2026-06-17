## Tech Stack

- **Framework:** Expo SDK 56, React Native 0.85, React 19
- **UI:** @expo/ui + React Native StyleSheet
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **State:** @tanstack/react-query (server), React Context
- **AI (LLM):** `@ai-sdk/openai-compatible` → MiMo V2.5 Pro (`https://api.xiaomimimo.com/v1`, header: `api-key`)
- **AI (TTS):** `openai` package → MiMo V2.5 TTS (same endpoint, audio output)
- **AI (Image):** `@ai-sdk/google` → Gemini 3.1 Flash (watercolor covers)
- **Audio:** expo-audio (background playback)
- **Monetization:** RevenueCat (V1.1 for consumables)
- **Animations:** react-native-reanimated
