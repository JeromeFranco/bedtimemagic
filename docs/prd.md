# Product Requirements Document (PRD): Project "Bedtime Magic" (MVP)

Document Status: Approved & Locked (Local Caching Update)
Target Audience: AI Coding Agents (Cursor, Claude Code, GitHub Copilot) & Solo Developer
Last Updated: June 2026
Project Timeline: 3 Months (Strict)

## 1. Executive Summary

**Project Name:** Bedtime Magic (Working Title)

**Core Concept:** A mobile application that empowers exhausted parents to instantly generate hyper-personalised, stage-adaptive audio bedtime stories. Stories target approximately six minutes for preschool children, eight minutes for early-primary children, and ten minutes for older children. They help children navigate daily behavioural challenges through the empathetic lens of a recurring AI protagonist.

**Primary Value Proposition:** Turning bedtime friction into peaceful, educational bonding moments using frontier-level One-Shot Reasoning AI, built on a strict privacy-first foundation that collects zero children's PII (Personally Identifiable Information).

## 2. Core Philosophy & Strict Guardrails

AI Agents MUST adhere to these principles at all times. Violations of these guardrails are considered critical bugs.

- **1. Sleep Hygiene First (Dark Mode Only):** The UI MUST default to and strictly enforce a dark-mode aesthetic. Use deep blues, purples, and low-contrast text. NEVER use pure white backgrounds or bright, stimulating colours.
- **2. Zero Cloud Audio Storage (Local Client Caching Only):** To protect bootstrapper margins and infrastructure boundaries, the app MUST NOT store generated audio blobs in cloud storage buckets or central database rows. However, to minimise repetitive TTS API costs for children's favourite repeat stories, the client application MUST utilise a local, volatile on-device cache for the audio of the 5 stories visible in the history vault.
- **3. COPPA, GDPR-K, & Store Compliance:** The app collects no real names, exact ages, or free-form text about minors. It functions strictly as a parent-directed utility and is listed under Health/Lifestyle/Education categories, never the Kids Category. Compliance relies on data minimization, store classification, privacy disclosures, and legal review—not an interaction that claims to verify adulthood.
- **4. Cognitive Load Reduction:** The parent user is likely exhausted. UI flows MUST minimise typing. Rely entirely on Quick-Taps and choice chips. Keyboard input is banned outside of adult authentication and the Bedtime Nickname field.
- **5. No "Vibe Coding" Feature Creep:** Do not build features that are not explicitly defined in this PRD. If a feature is not listed here, it belongs in V2.

## 3. MVP Feature Specifications

### 3.1. Anonymous Child Profiles

- **Function:** Stores Bedtime Nickname, Developmental Stage, and chosen Protagonist in Supabase under the current anonymous session. Supabase is the sole profile source of truth; local storage holds only onboarding completion and selected-profile identity.
- **Constraint:** No real names, dates of birth, or exact ages are requested. Objective nickname validation permits 1–24 normalized Unicode letters/numbers plus spaces, apostrophes, and hyphens; it does not claim to detect real names. Parents can create and quick-switch multiple profiles.

### 3.2. The Recurring Protagonist

- **Function:** The main character of the stories.
- **Constraint:** NO custom character creators. The app MUST provide exactly 5 hardcoded, pre-defined protagonists (e.g., Barnaby Bear, Captain Nova, Pip the Penguin) chosen during onboarding.

### 3.3. 100% Tap-Only Quick-Challenge Matrix

- **Function:** The primary input method for the daily story theme. Completely replaces free-text boxes to prevent PII leakage.
- **Mechanic:** A two-tier tap matrix. Selecting a Tier 1 Core Challenge dynamically reveals a secondary set of pre-defined choice chips.

| Tier 1: Core Challenge | Tier 2: Specific Triggers (Revealed on Tap)                               |
| :--------------------- | :------------------------------------------------------------------------ |
| Screen Time Limits     | Stopping video games \| Turning off the TV \| Giving back the tablet      |
| Big Emotions / Anger   | Yelling \| Hitting/Pushing \| Tantrum when told 'No'                      |
| Bedtime Friction       | Leaving the bedroom \| Refusing to brush teeth \| Wanting to stay up late |
| Social Skills          | Sharing toys \| Telling the truth \| Chores and Patience                  |

### 3.4. The One-Shot Reasoning Story Engine

- **Function:** Generates the complete story package (text, moral, and post-story interaction prompts) in a single optimised execution.
- **Architecture:** One-shot story generation through the MiMo V2.5 Pro OpenAI-compatible API. The completed story text is split at natural narrative boundaries under Inworld's 2,000-character input limit. Each segment is synthesized sequentially with Inworld TTS, cached locally as MP3, and appended in order to one native Expo Audio playlist for prepared, gapless track transitions.
- **Model:** MiMo V2.5 Pro with reasoning enabled, configured to run safety, structure, stage-fit, speakability, and pacing checks internally before producing exact JSON output.
- **Output Payload:**
  1. Story Title
  2. Full Story Text with stage-adaptive targets: approximately 700–850 words for preschool (six minutes), 900–1,050 words for early primary (eight minutes), or 1,100–1,250 words for older kids (ten minutes), structured as a declining-arousal narrative and seamlessly integrating the Bedtime Nickname
  3. The Moral
  4. Pillow Talk Prompt (Single low-arousal parent discussion question)
  5. Sleepy Affirmation (Short, comforting phrase for the child to repeat)
  6. Cover Image (Generated asynchronously via an image synthesis model in a muted "watercolor children's book" style)

### 3.5. Story History Vault & Local Cache

- **Function:** A history vault interface showing the last 5 generated stories.
- **Data Layer:** Text and core structural metadata are stored within central database rows (Supabase).
- **Local Audio Caching Mechanic:** When story segments are synthesized for the first time, incoming MP3 bytes MUST be written to the client device's volatile cache directory (iOS: NSCachesDirectory, Android: context.cacheDir) using the Supabase story ID and segment index as the identifier.
- **Cache-First Playback Engine:** Replaying an item from the history vault triggers an immediate check for the local file path. If a cache hit occurs, playback begins instantly with 0ms network lag and $0 API cost. If a cache miss occurs, the player falls back to the backend streaming pipeline.
- **Eviction Policy:** Enforce an automated First-In, First-Out (FIFO) cleanup rule. If a new file is added and the total audio count within the local directory exceeds 5, a background operation must immediately purge the oldest cached audio file based on its last modified timestamp. Local cache eviction operates on a complete story bundle wrapper. When an audio file UUID is purged via the FIFO pipeline, its corresponding cached watercolor cover image asset must be deleted from local disk storage simultaneously. This guarantees a highly disciplined client storage footprint (~15MB to 25MB total).

### 3.6. Parent’s Lesson Log

- **Function:** A private dashboard tracking behavioural progress over time.
- **Mechanic:** Post-story, parent logs feedback using 3 emojis: Great, Okay, or Missed the mark.

## 4. User Experience (UX) & Screen Flows

### 4.1. Onboarding Flow (FTUE - First Time User Experience)

**Goal:** Introduce the parent-directed utility, collect the minimum anonymous profile data, and land on Home without flashing the tab shell.

1. **First-Run Parent Welcome:** A deepest-dark, low-stimulus surface appears before tabs. Copy: _"Turn bedtime battles into life lessons."_ The primary action is _"Create Tonight's Story"_. It requests no age or birth-year data and makes no claim of adult verification.
2. **Profile Details:** A standard Bedtime Nickname field includes privacy guidance and objective format validation. Preschool, Early Primary, and Older Kids are three visible single-choice rows, not a dropdown.
3. **Protagonist Selection:** A second focused screen requires one text-only choice: Barnaby, Captain Nova, Pip, Luna, or Rex.
4. **Persistence and Landing:** The profile is created under the existing anonymous Supabase session, selected, and followed by local onboarding-completion persistence scoped to that anonymous user identity. The protected onboarding stack then resolves directly to Home.

Existing installations with one or more profiles skip onboarding without data deletion. Add Profile reuses the two profile screens from Home, selects the created profile, and dismisses back to Home. Email/Apple registration, anonymous-account claiming, entitlements, story allowances, and paywall behavior remain outside this onboarding phase.

### 4.2. Daily Generation Flow

1. **Home:** Select Profile -> Tap-Only Challenge Matrix -> Generate.
2. **Review & Optimistic Pre-Fetching:** Parent views the generated Story Card (Title, Cover Art, and Moral). While the parent spends 3 to 5 seconds reviewing this high-level metadata, the app client silently initiates a background worker to fetch, process, and warm up the cache for the first two sentences of the narrative.
3. **Playback Phase 1 (Wind-Down):** Parent taps _"Play"_. Playback initiates using the completed opening segment. Concurrently, later segments are synthesized sequentially, cached, and appended to the same native Expo Audio playlist in story order. Screen is ON but dimmed, displaying the watercolor cover art and playback controls.
4. **Playback Phase 2 (Sleep Mode):** Toggle button to turn screen completely BLACK. Native background audio playback continues reading seamlessly through the buffered local disk files.
5. **Post-Story Bridge:**
   - Audio fades to soft ambient noise.
   - Screen wakes up gently to show the Pillow Talk Prompt. Parent taps _"Next"_.
   - Screen shows the Sleepy Affirmation. Parent taps _"Goodnight"_.
   - App starts 15-min sleep timer (white noise) and locks.

## 5. Monetization & Paywall Logic

**Implementation Tool:** RevenueCat
**Strategy:** Hybrid Freemium (Subscription)

- **Free Tier:** 3 Magic Stories total upon account creation.
- **Subscription ("Bedtime Plus"):** $6.99/mo or $49.99/yr.
- **Constraint:** Capped at 15 custom generations per month to protect API margins against intensive test-time compute costs. Capping must be explicitly disclosed on the paywall screen.
- **Unlimited:** Replaying cached text and local audio files from the history Vault is completely unlimited with zero variable margin cost.
