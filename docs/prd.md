# Product Requirements Document (PRD): Project "Bedtime Magic" (MVP)

Document Status: Approved & Locked (Local Caching Update)
Target Audience: AI Coding Agents (Cursor, Claude Code, GitHub Copilot) & Solo Developer
Last Updated: June 2026
Project Timeline: 3 Months (Strict)

## 1. Executive Summary

**Project Name:** Bedtime Magic (Working Title)

**Core Concept:** A mobile application that empowers exhausted parents to instantly generate hyper-personalised, 10-minute audio bedtime stories. These stories are designed to help children navigate daily behavioural challenges and learn life lessons through the empathetic lens of a recurring AI protagonist.

**Primary Value Proposition:** Turning bedtime friction into peaceful, educational bonding moments using frontier-level One-Shot Reasoning AI, built on a strict privacy-first foundation that collects zero children's PII (Personally Identifiable Information).

## 2. Core Philosophy & Strict Guardrails

AI Agents MUST adhere to these principles at all times. Violations of these guardrails are considered critical bugs.

- **1. Sleep Hygiene First (Dark Mode Only):** The UI MUST default to and strictly enforce a dark-mode aesthetic. Use deep blues, purples, and low-contrast text. NEVER use pure white backgrounds or bright, stimulating colours.
- **2. Zero Cloud Audio Storage (Local Client Caching Only):** To protect bootstrapper margins and infrastructure boundaries, the app MUST NOT store generated audio blobs in cloud storage buckets or central database rows. However, to minimise repetitive TTS API costs for children's favourite repeat stories, the client application MUST utilise a local, volatile on-device cache for the audio of the 5 stories visible in the history vault.
- **3. COPPA, GDPR-K, & Store Compliance:** The app collects ZERO real names, exact ages, or free-form text about minors. It functions strictly as a parent utility. It must include an Adult Gate during onboarding and be listed under Health/Lifestyle/Education categories, never the Kids Category.
- **4. Cognitive Load Reduction:** The parent user is likely exhausted. UI flows MUST minimise typing. Rely entirely on Quick-Taps and choice chips. Keyboard input is banned outside of adult authentication and the Bedtime Nickname field.
- **5. No "Vibe Coding" Feature Creep:** Do not build features that are not explicitly defined in this PRD. If a feature is not listed here, it belongs in V2.

## 3. MVP Feature Specifications

### 3.1. Anonymous Child Profiles

- **Function:** Stores profile metadata: Bedtime Nickname and Behavioural/Developmental Stage.
- **Constraint:** No real names, no dates of birth, and no exact ages are permitted. Parents can have multiple profiles with quick-switching capability.

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
- **Architecture:** One-Shot Prompting using a Frontier Reasoning Model (with Test-Time Compute). Replaces the multi-turn agentic workflow to drastically reduce bedtime execution latency. Tokens are buffered on the server and immediately chunked by sentence boundaries for streaming into the Text-to-Speech engine.
- **Model:** Frontier Model with thinking level set high, configured to run safety, structure, and pacing checks internally within its reasoning trace before producing output.
- **Output Payload:**
  1. Story Title
  2. Full Story Text (approx. 1,200–1,500 words structured for a 10-minute slow-paced narrative runtime, seamlessly integrating the Bedtime Nickname)
  3. The Moral
  4. Pillow Talk Prompt (Single low-arousal parent discussion question)
  5. Sleepy Affirmation (Short, comforting phrase for the child to repeat)
  6. Cover Image (Generated asynchronously via an image synthesis model in a muted "watercolor children's book" style)

### 3.5. Story History Vault & Local Cache

- **Function:** A history vault interface showing the last 5 generated stories.
- **Data Layer:** Text and core structural metadata are stored within central database rows (Supabase).
- **Local Audio Caching Mechanic:** When a story audio track is generated/streamed for the first time, incoming audio bytes MUST be written concurrently to the client device's volatile cache directory (iOS: NSCachesDirectory, Android: context.cacheDir) using the unique Supabase story_id UUID as the identifier (e.g., audio\_\[story_id\].mp3).
- **Cache-First Playback Engine:** Replaying an item from the history vault triggers an immediate check for the local file path. If a cache hit occurs, playback begins instantly with 0ms network lag and $0 API cost. If a cache miss occurs, the player falls back to the backend streaming pipeline.
- **Eviction Policy:** Enforce an automated First-In, First-Out (FIFO) cleanup rule. If a new file is added and the total audio count within the local directory exceeds 5, a background operation must immediately purge the oldest cached audio file based on its last modified timestamp. Local cache eviction operates on a complete story bundle wrapper. When an audio file UUID is purged via the FIFO pipeline, its corresponding cached watercolor cover image asset must be deleted from local disk storage simultaneously. This guarantees a highly disciplined client storage footprint (~15MB to 25MB total).

### 3.6. Parent’s Lesson Log

- **Function:** A private dashboard tracking behavioural progress over time.
- **Mechanic:** Post-story, parent logs feedback using 3 emojis: Great, Okay, or Missed the mark.

## 4. User Experience (UX) & Screen Flows

### 4.1. Onboarding Flow (FTUE - First Time User Experience)

**Goal:** Establish legal compliance and get the user to hearing the first story in under 90 seconds using Lazy Registration.

1. **Adult Gate & Splash:** Dark mode animation. Prompts parent to solve a simple math barrier or enter birth year to verify adult status. Copy: _"Turn bedtime battles into life lessons."_ Button: _"Create Tonight's Story"_.
2. **Child Profile Creation (Anonymous):**
   - Input field: _"Bedtime Nickname"_ (with placeholder: e.g., Sparky, Rocket, or Buddy).
   - Dropdown selector: _"Developmental Level"_ (Options: Preschool, Early Primary, Older Kids).
   - Privacy Trust Badge: _"🔒 Privacy First: To keep your child safe, we never ask for real names or birthdates."_
3. **Quick-Tap Challenge:** Select Tier 1 challenge chip, then select the auto-revealed Tier 2 trigger chip. Button: _"Generate Magic ✨"_.
4. **Sensory Loading Transition:** Deep navy low-stimulus screen. Displays a slow, pulsating ambient circle serving as a calm breathing pacer (_"Breathe in slowly..."_) to absorb the initial LLM thinking time without causing visual stimulation.
5. **Paywall & Lazy Auth:** Show Story Card (Title, Cover Art, Moral). Prompt user to _"Claim 3 Free Stories"_. Only at this exact moment trigger Supabase Auth (Email/Apple Sign-In) to save the account and the generated text. The Paywall & Lazy Auth card screen serves as the initial optimistic pre-fetch anchor. The client application must kick off the background sentence-one and sentence-two TTS fetch operations while the parent is interacting with the registration layout.
6. **Playback:** Drop directly into the Audio Player.

### 4.2. Daily Generation Flow

1. **Home:** Select Profile -> Tap-Only Challenge Matrix -> Generate.
2. **Review & Optimistic Pre-Fetching:** Parent views the generated Story Card (Title, Cover Art, and Moral). While the parent spends 3 to 5 seconds reviewing this high-level metadata, the app client silently initiates a background worker to fetch, process, and warm up the cache for the first two sentences of the narrative.
3. **Playback Phase 1 (Wind-Down):** Parent taps _"Play"_. Playback initiates immediately using the pre-fetched local audio buffer. Concurrently, the remaining story blocks stream over the network and pipe directly into the local cacheDir destination file. Screen is ON but dimmed, displaying the watercolor cover art and playback controls.
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
