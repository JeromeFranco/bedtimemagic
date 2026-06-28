# User Stories: Bedtime Magic MVP

**Source:** `docs/prd.md`
**Strategy:** Daily generation flow first — seed data unblocks core feature testing without auth/onboarding.

---

## Phase 0: Data Seeding & Foundation

> Enable daily generation without requiring onboarding or auth. Seed all reference data locally so the core loop can be tested from day one.

### US-0.1: Seed Protagonist Data

**As a** developer,
**I want** 5 hardcoded protagonists seeded in the app,
**So that** story generation can select a protagonist without requiring user onboarding.

**Acceptance Criteria:**
- [ ] 5 protagonists defined: Barnaby Bear, Captain Nova, Pip the Penguin, Luna the Owl, Captain Whiskers
- [ ] Each protagonist has: id, name, species, personality description, voice/tonality notes for TTS
- [ ] Data is available as a static seed (JSON/TypeScript constants) — not fetched from Supabase
- [ ] Default protagonist selected automatically for seed profile

---

### US-0.2: Seed Challenge Matrix

**As a** developer,
**I want** the two-tier challenge matrix seeded as static data,
**So that** the tap-only challenge selection UI works immediately.

**Acceptance Criteria:**
- [ ] 4 Tier 1 Core Challenges defined: Screen Time Limits, Big Emotions/Anger, Bedtime Friction, Social Skills
- [ ] Each Tier 1 has 3 Tier 2 Specific Triggers (12 total)
- [ ] Data structure supports dynamic reveal: selecting Tier 1 → reveals only its Tier 2 chips
- [ ] Data is a TypeScript constant array — no network dependency

---

### US-0.3: Seed Default Child Profile

**As a** developer,
**I want** a default child profile pre-seeded locally,
**So that** the daily generation flow can run without onboarding.

**Acceptance Criteria:**
- [ ] Default profile created on first app launch: nickname "Buddy", stage "Early Primary"
- [ ] Stored in local device storage (not Supabase)
- [ ] Profile switcher shows at least this default profile
- [ ] Profile can be deleted by user (with confirmation)

---

### US-0.4: Seed Story Engine Prompt Template

**As a** developer,
**I want** the one-shot reasoning prompt template defined and testable,
**So that** story generation produces structured output.

**Acceptance Criteria:**
- [ ] Prompt template accepts: protagonist, child nickname, developmental stage, Tier 1 challenge, Tier 2 trigger
- [ ] Prompt instructs model to output JSON with: title, storyText (~1200–1500 words), moral, pillowTalkPrompt, sleepyAffirmation
- [ ] Prompt enforces: sleep-appropriate tone, 10-minute pacing, no PII, protagonist integration
- [ ] Model configured with high thinking level for internal safety/structure checks

---

## Phase 1: Daily Generation Core

> The primary user journey: select profile → choose challenge → generate story → review → play → post-story.

### US-1.1: Home Screen — Profile Selector

**As a** parent,
**I want** to quickly select which child's story to generate,
**So that** I can generate a personalized story in one tap.

**Acceptance Criteria:**
- [ ] Home screen displays current profile name and avatar/icon
- [ ] Tapping profile opens a quick-switch sheet (bottom sheet or dropdown)
- [ ] Default "Buddy" profile is pre-selected
- [ ] "Add Profile" option available (goes to profile creation — Phase 3)
- [ ] Dark mode enforced: deep blues/purples, no bright backgrounds

---

### US-1.2: Challenge Matrix — Tap Selection

**As a** parent,
**I want** to select a challenge using only taps (no typing),
**So that** I can describe the issue quickly while exhausted.

**Acceptance Criteria:**
- [ ] Tier 1 chips displayed as large tappable cards (4 options)
- [ ] Tapping a Tier 1 chip reveals its 3 Tier 2 chips below with animation
- [ ] Only one Tier 1 and one Tier 2 can be active at a time
- [ ] Selecting a different Tier 1 collapses previous Tier 2 and reveals new ones
- [ ] "Generate" button appears and becomes enabled only when both tiers are selected
- [ ] No keyboard input anywhere in this flow

---

### US-1.3: Story Generation — Loading Experience

**As a** parent,
**I want** a calming transition while the story generates,
**So that** I'm not staring at a spinner while the LLM thinks.

**Acceptance Criteria:**
- [ ] After tapping "Generate", screen transitions to deep navy low-stimulus screen
- [ ] Slow pulsating ambient circle displayed (calm breathing pacer)
- [ ] Copy: "Breathe in slowly..." — rotates to other calming messages
- [ ] No bright elements, no progress percentage, no spinning icons
- [ ] Transition completes when story payload returns from API

---

### US-1.4: Story Card Review

**As a** parent,
**I want** to see a preview of the generated story before playing,
**So that** I can verify it's appropriate for tonight.

**Acceptance Criteria:**
- [ ] Displays: Story Title, Watercolor Cover Art (async-generated), Moral summary
- [ ] "Play Story" button prominently displayed
- [ ] Background prefetch starts: first 2 sentences of TTS audio fetched and cached
- [ ] If cover art isn't ready yet, show a calm placeholder (not a broken image)
- [ ] Dark mode card aesthetic maintained

---

### US-1.5: Audio Playback — Wind-Down Phase

**As a** parent,
**I want** the story audio to play immediately with smooth streaming,
**So that** my child can start settling down without delay.

**Acceptance Criteria:**
- [ ] Playback starts instantly from pre-fetched local audio buffer
- [ ] Remaining story blocks stream over network and write to local cacheDir concurrently
- [ ] Screen stays ON but dimmed during playback
- [ ] Watercolor cover art displayed as background
- [ ] Playback controls: play/pause, seek bar (minimal), volume
- [ ] Audio uses background audio session (continues if app backgrounded briefly)

---

### US-1.6: Audio Playback — Sleep Mode

**As a** parent,
**I want** to turn the screen completely black while audio continues,
**So that** my child isn't stimulated by screen light.

**Acceptance Criteria:**
- [ ] Toggle button available: "Sleep Mode" / "Screen Off"
- [ ] Tapping toggle turns screen completely BLACK
- [ ] Audio continues playing seamlessly — no interruption or restart
- [ ] Tapping screen (anywhere) wakes display back to playback UI
- [ ] Native background audio playback used for reliability

---

### US-1.7: Post-Story Bridge — Pillow Talk

**As a** parent,
**I want** a gentle discussion prompt after the story ends,
**So that** I can reinforce the lesson with my child.

**Acceptance Criteria:**
- [ ] Audio fades to soft ambient noise before ending
- [ ] Screen gently wakes up (brightness ramp) to show Pillow Talk Prompt
- [ ] Prompt is a single low-arousal question (from story output)
- [ ] "Next" button to proceed
- [ ] No pressure — skip option available

---

### US-1.8: Post-Story Bridge — Sleepy Affirmation

**As a** parent,
**I want** a comforting closing phrase,
**So that** my child falls asleep with a positive thought.

**Acceptance Criteria:**
- [x] Sleepy Affirmation displayed (short comforting phrase from story output)
- [x] "Goodnight" button to confirm
- [ ] ~~15-minute white noise sleep timer starts~~ (descoped from MVP)
- [ ] ~~App locks (prevents accidental interaction)~~ (descoped from MVP)
- [ ] ~~Timer can be cancelled if needed~~ (descoped from MVP)

---

### US-1.9: Background Audio — Sentence-Level Streaming & Caching

**As a** developer,
**I want** audio streamed and cached at sentence boundaries,
**So that** playback is smooth and local cache is populated for replays.

**Acceptance Criteria:**
- [ ] Story text split into sentences on server before TTS
- [ ] Each sentence's audio chunk streamed to client immediately
- [ ] Chunks written to device cacheDir as `audio_[story_id].mp3`
- [ ] Playback reads from cache file as chunks arrive (no wait for full file)
- [ ] On cache miss (replay), falls back to full network stream

---

## Phase 2: Story Engine Backend

> The Supabase Edge Function that powers generation.

### US-2.1: Generate Story Edge Function

**As a** developer,
**I want** a Supabase Edge Function that orchestrates story generation,
**So that** the client sends inputs and receives a structured story payload.

**Acceptance Criteria:**
- [ ] Edge Function accepts: protagonistId, childNickname, developmentalStage, tier1Challenge, tier2Trigger
- [ ] Calls frontier reasoning model (MiMo V2.5 Pro) with one-shot prompt
- [ ] Parses structured JSON output: title, storyText, moral, pillowTalkPrompt, sleepyAffirmation
- [ ] Returns full payload to client
- [ ] Handles model errors gracefully (timeout, malformed output, safety filter)

---

### US-2.2: Sentence-Level TTS Streaming

**As a** developer,
**I want** story text chunked by sentences and sent to TTS concurrently with LLM generation,
**So that** audio playback can start before the full story is generated.

**Acceptance Criteria:**
- [ ] As LLM streams story text, sentences are extracted at sentence boundaries
- [ ] Each complete sentence sent to TTS (MiMo V2.5 TTS) immediately
- [ ] TTS audio chunks streamed back to client via SSE or chunked response
- [ ] Client receives and plays/writes chunks in order
- [ ] No full-text buffering required — true streaming pipeline

---

### US-2.3: Cover Image Generation

**As a** developer,
**I want** watercolor cover images generated asynchronously per story,
**So that** the story card has a unique visual without blocking generation.

**Acceptance Criteria:**
- [ ] After story text is generated, cover image request sent to Gemini 3.1 Flash
- [ ] Prompt generates muted "watercolor children's book" style illustration based on story theme
- [ ] Image returned asynchronously — story card shows placeholder until ready
- [ ] Image cached locally alongside audio (same eviction policy)

---

### US-2.4: Story Persistence

**As a** developer,
**I want** generated stories saved to Supabase,
**So that** story history is available across devices and sessions.

**Acceptance Criteria:**
- [ ] Story metadata saved: id, protagonist, challenge, title, moral, timestamps
- [ ] Story text saved for history vault display
- [ ] Cover image URL saved (generated separately)
- [ ] Audio NOT stored in cloud — local cache only (per PRD guardrail)
- [ ] Record linked to child profile (or anonymous session before auth)

---

## Phase 3: Onboarding Flow

> FTUE — First Time User Experience. Built after core generation works.

### US-3.1: Adult Gate

**As a** parent,
**I want** an age verification gate on first launch,
**So that** the app is COPPA/GDPR-K compliant.

**Acceptance Criteria:**
- [ ] Dark mode animation splash on first launch
- [ ] Simple math barrier or birth year entry to verify adult status
- [ ] Copy: "Turn bedtime battles into life lessons."
- [ ] Button: "Create Tonight's Story"
- [ ] Gate state persisted — not shown again after passing

---

### US-3.2: Anonymous Profile Creation

**As a** parent,
**I want** to create a child profile with just a nickname and stage,
**So that** stories are personalized without sharing PII.

**Acceptance Criteria:**
- [ ] Input field: "Bedtime Nickname" (placeholder: Sparky, Rocket, or Buddy)
- [ ] Dropdown: "Developmental Level" — Preschool, Early Primary, Older Kids
- [ ] Privacy badge: "🔒 Privacy First: We never ask for real names or birthdates."
- [ ] No real names, no DOB, no exact ages — enforced by input validation
- [ ] Profile saved locally (and to Supabase after auth)

---

### US-3.3: Lazy Auth & Paywall

**As a** parent,
**I want** to generate and hear my first story before creating an account,
**So that** I experience value before being asked to register.

**Acceptance Criteria:**
- [ ] Story generates and story card displays BEFORE auth prompt
- [ ] Background TTS prefetch starts while parent views story card
- [ ] Paywall card shown: "Claim 3 Free Stories" — triggers Supabase Auth (Email/Apple)
- [ ] Auth completes → account created, story saved, playback begins
- [ ] If auth skipped → story still plays (but not persisted)

---

## Phase 4: Story History Vault

> Replay past stories from local cache with zero API cost.

### US-4.1: History Vault View

**As a** parent,
**I want** to see my last 5 generated stories,
**So that** my child can replay their favorites.

**Acceptance Criteria:**
- [ ] History list shows up to 5 most recent stories
- [ ] Each entry: title, cover art thumbnail, protagonist, challenge tag, date
- [ ] Tapping an entry opens story detail / playback
- [ ] Empty state: friendly prompt to generate first story
- [ ] Dark mode enforced

---

### US-4.2: Local Audio Cache Management

**As a** developer,
**I want** audio files cached locally with FIFO eviction,
**So that** replay is instant and storage stays under ~25MB.

**Acceptance Criteria:**
- [ ] Audio cached at `audio_[story_id].mp3` in device cacheDir
- [ ] Cover image cached alongside audio (same directory or sibling)
- [ ] FIFO eviction: when 6th file added, oldest file + its cover image deleted
- [ ] Cache hit → instant playback, 0ms network lag
- [ ] Cache miss → fallback to network streaming

---

### US-4.3: Replay Playback

**As a** parent,
**I want** to replay a cached story instantly,
**So that** my child can hear favorite stories without generating new ones.

**Acceptance Criteria:**
- [ ] Replay reads directly from local cache file
- [ ] Same playback UI as fresh generation (dimmed screen, controls, sleep mode)
- [ ] Same post-story bridge (pillow talk, affirmation, timer)
- [ ] No TTS API cost for replays
- [ ] Unlimited replays (per PRD)

---

## Phase 5: Parent's Lesson Log

> Track behavioural progress over time.

### US-5.1: Post-Story Feedback

**As a** parent,
**I want** to rate how well the story landed after each session,
**So that** I can track progress and the app can improve.

**Acceptance Criteria:**
- [ ] After post-story bridge, 3 emoji options shown: Great 👍, Okay 🤝, Missed the mark 😕
- [ ] Single tap to select — no confirmation needed
- [ ] Feedback stored against story record in Supabase
- [ ] Skip option available (no forced feedback)

---

### US-5.2: Lesson Log Dashboard

**As a** parent,
**I want** to view a summary of past feedback over time,
**So that** I can see behavioural trends for my child.

**Acceptance Criteria:**
- [ ] Dashboard accessible from home screen or profile
- [ ] Shows stories chronologically with feedback emoji
- [ ] Filterable by challenge category
- [ ] Visual trend indicators (improving, consistent, needs attention)
- [ ] No raw data export — privacy-first display only

---

## Phase 6: Monetization

> RevenueCat integration for free tier and subscription.

### US-6.1: Free Tier Enforcement

**As a** parent,
**I want** to understand my free story allowance,
**So that** I know when I'll need to subscribe.

**Acceptance Criteria:**
- [ ] 3 free stories total upon account creation
- [ ] Story counter displayed subtly on home screen (e.g., "Story 2 of 3 free")
- [ ] After 3 stories, generation blocked with paywall prompt
- [ ] Replays of cached stories are unlimited — not counted

---

### US-6.2: Paywall & Subscription

**As a** parent,
**I want** a clear paywall with subscription options,
**So that** I can unlock unlimited stories if I find value.

**Acceptance Criteria:**
- [ ] Paywall screen: "Bedtime Plus" — $6.99/mo or $49.99/yr
- [ ] 15 custom generations per month cap disclosed on paywall
- [ ] RevenueCat manages subscription lifecycle
- [ ] Restore purchases available
- [ ] Subscription state checked on app launch

---

## Implementation Order (Recommended)

```
Phase 0 ─→ Phase 1 ─→ Phase 2 ─→ Phase 3 ─→ Phase 4 ─→ Phase 5 ─→ Phase 6
Seeding      Core UI     Backend     Onboarding  History     Lesson Log  Monetization
```

**Critical path for first testable build:**
1. **US-0.1–0.4** (seed data) — enables everything
2. **US-1.1–1.3** (profile selector → challenge → generate) — core interaction
3. **US-2.1–2.2** (edge function + TTS streaming) — makes generation work
4. **US-1.4–1.5** (story card + playback) — completes the loop

**Estimated stories to MVP:** 23 user stories across 6 phases.
