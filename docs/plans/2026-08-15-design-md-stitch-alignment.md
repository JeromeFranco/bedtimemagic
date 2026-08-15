# DESIGN.md Stitch-Spec Alignment Implementation Plan

**Goal:** Rewrite DESIGN.md to the Google Stitch open-spec format (YAML design tokens + pruned prose), fix outdated claims against the current codebase, wire DESIGN.md into AGENTS.md with read/sync rules, and align app.json with the documented dark-only identity.

**Design:** Approved inline in the brainstorming session (no spec file). Approved decisions: full Stitch spec format with YAML front matter; token names match `src/theme` keys exactly; AGENTS.md rules only for sync (no validation script); app.json fixed now.

**Confidence:** High. Every "outdated" claim below was verified against source: `src/theme/*` (tokens), `src/components/ui/button.tsx` (3 variants incl. ghost), `src/components/ui/pressable-feedback.tsx` (native ripple/opacity, no Reanimated), `src/components/challenge-matrix.tsx:149` ("Create Tonight's Story"), `src/components/app-tabs.tsx` (NativeTabs Home/Vault), `app.json` (splash `#208AEF`, `userInterfaceStyle: "automatic"`).

**Constraints:**

- DESIGN.md YAML tokens and `src/theme/*` must end this change in exact agreement. Where the code and old doc disagree, the **code wins** — the doc records what ships.
- Token names in YAML mirror `src/theme` keys exactly (`bg-base` ↔ `bgBase`) so token→constant mapping is mechanical.
- Keep the rewritten DESIGN.md ≤ ~200 lines. Values live in YAML; prose carries rationale and rules only. No hex values in prose.
- The two aspirational rules with no current implementation (reduced-motion check for the breathing pacer; `expo-status-bar` light style) are kept as prescriptive design intent — wording must read as requirements ("must respect…", "set…"), not descriptions of existing behavior.
- DESIGN.md keeps its root location (`/DESIGN.md`). Do not move it to `.stitch/`.
- After every code-changing task, run `npm run lint` and `npm run typecheck` and fix all errors before progressing.

**Verified codebase facts the executor relies on (do not re-derive):**

- Theme source of truth: `src/theme/` — `colors.ts` (Colors.dark + CATEGORY_COLORS with 8 variants each: primary, tint, tintLight, tintStrong, tintSelected, textMuted, border, borderSubtle), `spacing.ts` (xxs 2 / xs 4 / sm 8 / md 12 / lg 16 / xl 24 / 2xl 32 / 3xl 48 / 4xl 64), `typography.ts` (presets hero 40 / subtitle 32 / title 24 / heading 20 / body 17 / link 15 / small 13 / code 12 / caption 11; weights 400/500/700 only; letterSpacings hero −0.4, subtitle −0.32), `radius.ts` (sm 8 / md 12 / lg 16 / pill 9999), `layout.ts` (maxContentWidth 800, screenMargin 16, sectionPadding 24, cardPadding 16, chipHeight 40, minTouchTarget 44, bottomTabInset ios 50/android 80), `motion.ts` (pressDuration 150). `src/constants/theme.ts` is a backwards-compat shim only.
- Colors.dark extras beyond old doc: `scrim rgba(0,0,0,0.5)`, `overlay rgba(6,10,26,0.8)`, `track rgba(226,224,240,0.15)`, `avatarTint rgba(255,255,255,0.1)`, `accentSoft rgba(139,92,246,0.2)`.
- Buttons (`src/components/ui/button.tsx`): variants primary (bgElement fill, textPrimary), secondary (1px borderDefault, textSecondary), ghost (bare, textSecondary); sizes default/compact; fullWidth. Shell radius `BorderRadius.md` (12).
- Press feedback (`src/components/ui/pressable-feedback.tsx`): Android `android_ripple` default `rgba(255,255,255,0.2)`; iOS opacity 0.7 on press. No Reanimated.
- Chip (`src/ui/chip.tsx`): bgElement, borderSubtle 1px, radius 24, minHeight 40.
- Motion in code: `withTiming` + `Easing.out`/`Easing.inOut` everywhere (story-player 1000ms sleep overlay, 15000ms Ken Burns drift; breathing-circle inOut pulse). No `withSpring` anywhere. No `isReduceMotionEnabled` usage yet.
- Navigation: `expo-router` NativeTabs (`expo-router/unstable-native-tabs`), Home + Vault tabs styled with bgBase background / bgElement indicator / textPrimary selected label. Screens: `/` (index), `/generate`, `/story`, `/vault`.
- Multi-child profiles exist (`profile-selector`, `profile-sheet`, `profile-avatar`); challenge selection is `challenge-matrix`; CTA copy is "Create Tonight's Story".
- `expo-status-bar` is installed but not imported anywhere in `src/`. `expo-screen-orientation` is **not** installed; portrait lock comes from `app.json` `"orientation": "portrait"`.

### Task 1: Rewrite DESIGN.md to the Stitch open-spec format

**Outcome:** Root `DESIGN.md` conforms to the Stitch design.md spec — YAML token front matter + markdown body in the standard section order — with all stale claims fixed and prose pruned.

**Files / symbols**

- Rewrite: `DESIGN.md`

**Implementation**

1. **YAML front matter** (between `---` fences), values copied verbatim from the verified facts above:
   - `version: alpha`, `name: Bedtime Magic`, `description:` one sentence (personalized audio bedtime stories; dark-only, warm-indigo, low-stimulus).
   - `colors:` all `Colors.dark` keys kebab-cased (bg-deepest, bg-base, bg-surface, bg-element, bg-element-hover, bg-selected, border-subtle, border-default, text-primary, text-secondary, text-muted, success, warning, error, scrim, overlay, track, avatar-tint, accent-soft), then category palettes keyed `category-screentime`, `category-emotions`, `category-bedtime`, `category-social` with sub-keys `primary`, `tint`, `tint-light`, `tint-strong`, `tint-selected`, `text-muted`, `border`, `border-subtle` (rgba strings quoted).
   - `typography:` presets hero, subtitle, title, heading, body, small, caption — each with `fontFamily: "system-ui"`, `fontSize`/`lineHeight` in px, `fontWeight` as bare number, `letterSpacing` in px where non-zero (hero `-0.4px`, subtitle `-0.32px`). Omit link/code presets from YAML (code 12 mono and link 15 duplicate body size; note in prose that `link`/`code` presets exist in `src/theme/typography.ts` for edge cases).
   - `rounded:` `sm: 8px`, `md: 12px`, `lg: 16px`, `full: 9999px` (maps to `pill`).
   - `spacing:` xxs 2px through 4xl 64px.
   - `components:` `button-primary` (backgroundColor `{colors.bg-element}`, textColor `{colors.text-primary}`, rounded `{rounded.md}`, padding 16px), `button-secondary` (backgroundColor transparent, textColor `{colors.text-secondary}`, rounded `{rounded.md}`, padding 16px, plus a prose note about the 1px `{colors.border-default}` border since the token schema has no borderColor property), `button-ghost` (textColor `{colors.text-secondary}` only), `chip` (backgroundColor `{colors.bg-element}`, rounded `{rounded.full}`, height 40px), `card` (backgroundColor `{colors.bg-surface}`, rounded `{rounded.lg}`, padding 16px).
2. **Body sections**, in this order, `##` headings:
   - `## Overview` — ≤1 paragraph: exhausted parent at 8pm, problem-not-browsing, tap-three-times-to-story; "quiet confidence" — dark, warm, low-stimulus; not a toy store, not a wellness-app cliché. One line: feels like Calm/Moshi/Libby, never Duolingo. One line: app shape — NativeTabs (Home + Vault), flow Home → Generate (challenge matrix + child profile) → Story player with sleep mode.
   - `## Colors` — dark-mode-only rationale (warm indigo night sky, never cold navy or pure black); accent/category colors are reserved for challenge chips and post-story feedback — never section fills or button backgrounds; one accent per screen; semantic usage (success/warning/error); contrast floor WCAG AA (primary ≈11.8:1, secondary ≈5.0:1 on bg-base); alt-text rule compressed to one line (describe the scene, never "image of").
   - `## Typography` — system fonts only, no custom font loading (audio-first app); weight discipline 400 body / 500 labels & nav / 700 titles & hero, never 300/600; tracking only at hero/subtitle sizes.
   - `## Layout` — single column, no formal grid; max content width 800 centered; 16px screen margins, 24px between sections, 16px card padding, 8px chip gaps; 44pt minimum touch targets; safe areas via `react-native-safe-area-context` (headers below inset; immersive player/sleep screens edge-to-edge); portrait-locked via `app.json` `orientation` field.
   - `## Elevation & Depth` — flat design: no drop shadows (invisible on dark, wasted render cost); hierarchy conveyed by stepping the neutral scale (bg-base → bg-surface → bg-element) and by scrims/overlays for modality.
   - `## Shapes` — radius roles: 12 buttons, 16 cards, pill chips; cover art square inside a rounded card clip.
   - `## Components` — Button: three variants (primary/secondary/ghost) + compact size; one primary CTA per screen; no icon-only buttons, no FABs. Chip: the app's primary interactive element, pill, ≥40px tall. Card: sparingly (story card, lesson-log entries), 16 radius, no shadow. Iconography: SF Symbols/Material Symbols regular weight, playback + navigation only, no decorative icons; emoji only in post-story feedback. Tabs: NativeTabs, bg-base bar, bg-element indicator. **Press feedback (updated):** `PressableFeedback` — Android ripple, iOS opacity; the platform handles it, no Reanimated. **Motion:** `withTiming` + `Easing.out`/`inOut` only, never `withSpring`; 150ms micro-interactions, 1000ms sleep-mode fades, ease-out everywhere; the motion language is "settle". **Reduced motion (aspirational, prescriptive wording):** the breathing pacer must respect `AccessibilityInfo.isReduceMotionEnabled()`.
   - `## Do's and Don'ts` — condensed anti-patterns: no gradients, no bright/saturated fills, no emoji in chrome, no gamification (streaks/badges/progress), no card grids, no empty states without a primary action, no inverted text. Then the decision hierarchy compressed to six one-liners (sleep hygiene > accessibility floor > cognitive load > tap-first > restraint > platform-native).
   - `## Voice & Tone` — warm, direct, unhurried; UI copy under 8 words, one-sentence instructions; "you" singular; the banned-words list; keep "Generate Magic" out (resolved: CTA is "Create Tonight's Story").
   - **Status bar (aspirational, prescriptive wording):** one line under Layout or Components: status bar must be light-style via `expo-status-bar`; Android translucent with bg-base to avoid a seam. Splash: bg-deepest, no logo flash.
3. Drop from the old doc entirely: cultural-register prose, multi-paragraph product narrative, the "Generate Magic" tension paragraph, hex values in prose, verbose focus-indicator/keyboard-nav detail, `src/constants/theme.ts` as token location (mention `src/theme/*` once in the Implementation-relevant prose, e.g. a one-liner in Colors or Typography: "Tokens are implemented in `src/theme/*`; keep this file and those modules in sync").

**Verify**

- `grep -nE '#[0-9A-Fa-f]{6}' DESIGN.md` → every match must be inside the YAML front matter (before the closing `---`), none in prose.
- Manual diff of YAML values against `src/theme/colors.ts`, `spacing.ts`, `typography.ts`, `radius.ts`, `layout.ts` — zero mismatches.
- Section order matches the spec: Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts (Voice & Tone may follow as an extra section; the spec preserves unknown sections).
- `wc -l DESIGN.md` ≤ ~200 lines.
- No remaining claims: "two variants only", "src/constants/theme.ts", "Generate Magic", "expo-screen-orientation", background-shift press feedback.

### Task 2: Add design-system rules to AGENTS.md

**Outcome:** Agents are instructed to consult DESIGN.md for any UI work and to keep it in sync with `src/theme` on every visual change.

**Files / symbols**

- Modify: `AGENTS.md` — append a new `## Design system (DESIGN.md)` section after the existing Rules.

**Dependencies:** Task 1 (rules reference the rewritten file's structure).

**Implementation**

Add exactly these rules (wording may be tightened, content must not change):

- Before creating or modifying UI — screens, components, styling, animations, or design tokens — read `DESIGN.md` (root). Its YAML front matter holds the normative tokens; `src/theme/*` is the implementation.
- Never hardcode colors, spacing, radii, or type values; always use tokens from `@/theme`.
- When a change intentionally alters visual design (new token, palette change, new component pattern, motion change), update `DESIGN.md` in the same change — YAML tokens and `src/theme/*` must never drift.
- On conflict between `DESIGN.md` and code, surface the discrepancy to the user before choosing; do not silently follow one.

**Verify**

- `cat AGENTS.md` — new section present, existing rules untouched.
- Rules mention: read-before-UI, `@/theme` tokens, same-change sync, conflict surfacing.

### Task 3: Align app.json with the dark-only design

**Outcome:** App config matches DESIGN.md: dark UI style and dark splash.

**Files / symbols**

- Modify: `app.json` — `expo.userInterfaceStyle`, splash plugin `backgroundColor`.

**Implementation**

1. Set `"userInterfaceStyle": "dark"` (currently `"automatic"`).
2. Set the `expo-splash-screen` plugin `backgroundColor` to `"#060A1A"` (currently `"#208AEF"`).
3. Touch nothing else in `app.json` (icons, permissions, plugins stay).

**Verify**

- `npm run lint` — clean.
- `npm run typecheck` — clean.
- `npm run test:ci` — full suite passes (config-only change; guards against incidental breakage).
- Optional sanity: `npx expo config --type public | grep -E 'userInterfaceStyle|backgroundColor'` shows the new values.

## Execution Handoff

Recommend **inline execution** (this session), followed by a fresh review subagent. All three tasks are tightly coupled around one theme (doc/config alignment), Task 1 is prose work where shared audit context matters most, and total diff is small (~1 config file, ~2 doc files). Subagent isolation would cost more context-transfer than it saves.
