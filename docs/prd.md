# Product Requirements Document (PRD): Project "Bedtime Magic" (MVP)

**Document Status:** Approved & Locked
**Target Audience:** AI Coding Agents (Cursor, Claude Code, GitHub Copilot) & Solo Developer
**Last Updated:** June 2026
**Project Timeline:** 3 Months (Strict)

---

## 1. Executive Summary
**Project Name:** Bedtime Magic (Working Title)
**Core Concept:** A mobile application that empowers exhausted parents to instantly generate hyper-personalized, 10-minute audio bedtime stories. These stories are designed to help children (ages 6-10) navigate daily behavioral challenges and learn life lessons through the empathetic lens of a recurring AI protagonist.
**Primary Value Proposition:** Turning bedtime friction into peaceful, educational bonding moments using frontier-level Agentic AI.

---

## 2. Core Philosophy & Strict Guardrails
*AI Agents MUST adhere to these principles at all times. Violations of these guardrails are considered critical bugs.*

1. **Sleep Hygiene First (Dark Mode Only):** The UI MUST default to and strictly enforce a dark-mode aesthetic. Use deep blues, purples, and low-contrast text. **NEVER** use pure white (`#FFFFFF`) backgrounds or bright, stimulating colors.
2. **Zero Audio Storage:** To protect bootstrapper margins and storage limits, the app MUST NOT store generated audio files in the database or cloud storage (e.g., AWS S3). Audio MUST be generated on-the-fly via TTS APIs or native device TTS during playback. Only the *text* of the story is saved.
3. **COPPA Compliance & Privacy:** No ads. No social sharing. No data selling. AI generation MUST be strictly filtered for gentle, child-safe, non-punitive themes.
4. **Cognitive Load Reduction:** The parent user is likely exhausted. UI flows MUST minimize typing. Rely on Quick-Taps, sliders, and voice-to-text fallbacks.
5. **No "Vibe Coding" Feature Creep:** Do not build features that are not explicitly defined in this PRD. If a feature is not listed here, it belongs in V2.

---

## 3. MVP Feature Specifications

### 3.1. Smart Child Profiles
*   **Function:** Stores child's Name, Age (6-11 range), and chosen Protagonist.
*   **Constraint:** Parents can have multiple child profiles, but the MVP should optimize for quick-switching between them.

### 3.2. The Recurring Protagonist
*   **Function:** The main character of the stories.
*   **Constraint:** **NO custom character creators.** The app MUST provide exactly 5 hardcoded, pre-defined protagonists (e.g., Barnaby Bear, Captain Nova, Pip the Penguin, etc.) chosen during onboarding.

### 3.3. Quick-Tap Challenge Matrix
*   **Function:** The primary input method for the daily story theme.
*   **Options:** Managing Anger, Sharing, Screen-time limits, Telling the Truth, Chores/Patience.
*   **Fallback:** A "Something else..." chip that opens a simple text/voice input box.

### 3.4. The Agentic Story Engine
*   **Function:** Generates the story text, moral, and discussion prompts.
*   **Architecture:** 2-Step Agentic Workflow (Outline -> Story).
*   **Model:** Xiaomi Mimo-V2.5 Pro (or equivalent high-tier MoE model).
*   **Output Payload:**
    1.  Story Title
    2.  Full Story Text (approx. 1,500 words / 10 mins reading time)
    3.  The Moral
    4.  Pillow Talk Prompt (Parent discussion question)
    5.  Sleepy Affirmation (Short, positive recitation for the child)
    6.  Cover Image (Generated asynchronously via gemini-3.1-flash-image in "watercolor children's book" style).

### 3.5. Text-Based Story Vault
*   **Function:** A library of previously generated stories.
*   **Constraint:** Stores ONLY text and metadata. Replaying a story triggers on-the-fly TTS generation.

### 3.6. Parent's Lesson Log
*   **Function:** A private dashboard tracking behavioral progress.
*   **Mechanic:** Post-story, parent logs feedback using 3 emojis: 🟢 (Great), 🟡 (Okay), 🔴 (Missed the mark).

---

## 4. User Experience (UX) & Screen Flows

### 4.1. Onboarding Flow (FTUE - First Time User Experience)
*Goal: Get the user to the "Aha!" moment (hearing the first story) in under 90 seconds using Lazy Registration.*
1. **Splash/Hook:** Dark mode animation. Copy: "Turn bedtime battles into life lessons." Button: "Create Tonight's Story".
2. **Child Universe:** Input Name, Age Slider, and Grid Select for 1 of 5 Protagonists. Include a "🔒 100% Private" trust badge.
3. **Quick-Tap Challenge:** Select the behavioral theme via chips. Button: "Generate Magic ✨".
4. **Loading Screen:** Pulsing animation with fading text ("Weaving a gentle lesson...", "Ensuring safe themes...").
5. **Paywall & Lazy Auth:** Show Story Card (Title, Cover Art, Moral). Prompt user to "Claim 3 Free Stories". *Only at this exact moment* trigger Supabase Auth (Email/Apple Sign-In) to save the story.
6. **Playback:** Drop directly into the Audio Player.

### 4.2. Daily Generation Flow
1. **Home:** Select Child -> Quick-Tap Challenge -> Generate.
2. **Review:** Parent views Story Card. Has option to "Play" or "Try Again" (Regenerate).
3. **Playback Phase 1 (Wind-Down):** Screen is ON but dimmed. Shows watercolor cover art, title, and pause button. Lasts while child gets into bed.
4. **Playback Phase 2 (Sleep Mode):** Toggle button to turn screen completely BLACK. Native background audio continues playing.
5. **Post-Story Bridge:**
    *   Audio fades to soft ambient noise.
    *   Screen wakes up gently to show the **Pillow Talk Prompt** (e.g., "Ask Leo: What could Rex have done instead of yelling?").
    *   Parent taps "Next".
    *   Screen shows the **Sleepy Affirmation** (e.g., "My hands are gentle, my heart is kind.").
    *   Parent taps "Goodnight". App starts 15-min sleep timer (white noise) and locks.

---

## 5. Monetization & Paywall Logic

**Implementation Tool:** RevenueCat
**Strategy:** Hybrid Freemium (Subscription + V1.1 Consumables)

*   **Free Tier:** 3 Magic Stories upon account creation.
*   **Subscription ("Bedtime Plus"):** $6.99/mo or $49.99/yr.
    *   **Constraint:** Capped at 15 custom generations per month to protect API margins.
    *   **Unlimited:** Replaying stories from the Vault is unlimited.
*   **Consumables (Story Tokens):** *Strictly deferred to V1.1 (Post-Launch).* Do not build IAP consumable logic in MVP.
