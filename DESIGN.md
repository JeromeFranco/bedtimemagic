# DESIGN.md — Bedtime Magic

## 1. Objective

The design should feel like a calm, trustworthy tool that gets out of the way. A parent holding a phone at 8pm, running on fumes, should be able to get from "my kid had a rough day" to a story playing in under 60 seconds with zero friction. The visual system should read as *quiet confidence* — dark, warm, low-stimulus — not as a toy store or a wellness app trying too hard. Quality bar: something a thoughtful indie developer would be proud to ship, not a template.

## 2. Product Context

- **What the product does:** Generates personalised 10-minute audio bedtime stories that help children navigate behavioural challenges, told through a recurring protagonist.
- **Who it's for:** Exhausted parents of 3-to-10-year-olds, holding their phone in a dimly lit bedroom at 7:30–8:30pm. They're not browsing — they're solving a problem right now. They don't want to type, they don't want to think hard, they want to tap three times and hear a story start.
- **Adjacent brands (feel like these):** Calm (dark, low-stimulus, audio-first), Moshi (children's sleep content, warm but not garish), Libby (clean utility app that respects the user's time and attention).
- **Distant brand (do not feel like this):** Duolingo — too gamified, too bright, too much dopamine-loop energy for a sleep-context app.
- **Cultural register:** Intimate, trustworthy, warm. Not aspirational, not clinical, not playful in a "look at me" way. The brand should feel like a trusted friend who happens to know a lot about child development — not a corporation, not a cartoon.

## 3. Visual Foundations

### 3a. Color

The app operates in **dark mode exclusively**. There is no light mode. The palette is built around a warm indigo night sky — not cold navy, not pure black. Think of the sky twenty minutes after sunset: deep, warm, with just enough blue to feel open.

**Neutral scale (backgrounds and surfaces):**

| Token | Hex | Role |
|---|---|---|
| `--bg-deepest` | `#060A1A` | Sleep mode screen, true dark |
| `--bg-base` | `#0F1328` | Primary screen background — warm indigo, not cold navy |
| `--bg-surface` | `#171C38` | Elevated surfaces (cards, modals) |
| `--bg-element` | `#1F2545` | Interactive elements (chips, inputs) |
| `--bg-element-hover` | `#282F55` | Hover/press state |
| `--bg-selected` | `#2D345C` | Selected/active state |
| `--border-subtle` | `#232848` | Subtle dividers, card borders |
| `--border-default` | `#2E3560` | Visible borders |

The key shift: every neutral has a warm indigo undertone (`#0F1328` vs the previous cold `#0A0E27`). This gives the app a cohesive "night sky" feeling instead of a generic dark-mode dashboard.

**Text scale:**

| Token | Hex | Role |
|---|---|---|
| `--text-primary` | `#E2E0F0` | Headlines, primary body — slightly warm white, not clinical pure white |
| `--text-secondary` | `#8E8AA8` | Captions, secondary info — warm gray-lavender, not blue-gray |
| `--text-muted` | `#5C5878` | Disabled, tertiary |

**Category accents (challenge chips, post-story feedback):**

| Category | Primary | Tint (12% opacity) | Mood |
|---|---|---|---|
| Screen Time | `#7EB8E0` | `rgba(126,184,224,0.12)` | Moonlight through a window — cool but gentle |
| Big Emotions | `#D4A06A` | `rgba(212,160,106,0.12)` | Warm candlelight — amber, not electric yellow |
| Bedtime Friction | `#A07BD4` | `rgba(160,123,212,0.12)` | Lavender dusk — soft purple, not neon violet |
| Social Skills | `#7BC4A8` | `rgba(123,196,168,0.12)` | Sage after rain — muted green, not emerald |

Category colors are desaturated and shifted toward warmth. They glow softly against the indigo background like stained glass in a dim room, not like neon signs. Each color is used ONLY for challenge selection chips, their tints, and post-story lesson-log feedback. Never as section backgrounds, button fills, or decorative elements.

**Semantic colors:**

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#7BC4A8` | Positive feedback emoji, confirmed actions |
| `--warning` | `#D4A06A` | Usage caps approaching, gentle alerts |
| `--error` | `#D47A6A` | Auth failures, critical errors — muted coral, not aggressive red |

**Usage rules:**
- Accent/category color appears once per screen — on the active chip or the single most important interactive element. Never as a background fill.
- Backgrounds are always in the warm-indigo-to-dark range. No cold blues, no pure blacks, no gradients.
- Text is always light on dark. No inverted (dark on light) text anywhere.
- All category colors are desaturated enough that they pass 3:1 contrast against `--bg-element` when used as text.

### 3b. Typography

- **Display face:** System default (San Francisco on iOS, Roboto on Android), weight 700. Tracking: -0.01em for headlines 24px and above.
- **Body face:** System default, weight 400. No custom font loading — the app is audio-first, text-secondary. Custom fonts add load time and provide no value when the primary content is spoken.
- **Fallback stack:** `'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif`
- **Type scale:** `11 / 13 / 15 / 17 / 20 / 24 / 32 / 40` (iOS Dynamic Type–aligned, with 11 for captions and 40 for hero moments like the story title on the player screen)
- **Weight discipline:**
  - 400 (regular): all body text, chip labels, secondary info
  - 500 (medium): button labels, nav labels, section headers within a screen
  - 700 (bold): screen titles, story titles, the single hero number/stat on a screen
  - No weight 300 or 600 anywhere. Fewer weights = less visual noise.

### 3c. Spacing & rhythm

- **Base unit:** 4px
- **Spacing scale:** `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`
- **What "generous" means here:** Minimum 24px vertical padding between major sections. Minimum 16px horizontal screen margin. Chip-to-chip gap: 8px. Card internal padding: 16px all sides.
- **Touch targets:** Minimum 44×44pt (Apple HIG). Chips and buttons have at least 12px vertical padding to ensure comfortable tap zones for one-handed use in bed.

### 3d. Component seeds

- **Button:** Two variants only.
  - **Primary:** Filled with `--bg-element`, text in `--text-primary`, rounded 12px. One per screen. Used for the single most important action (Generate, Play, Claim Stories).
  - **Secondary:** Transparent background, border 1px `--border-default`, text in `--text-secondary`, rounded 12px. Used for everything else (Back, Skip, Cancel).
  - No ghost buttons, no icon-only buttons, no floating action buttons.

- **Card / container:** Used sparingly. Rounded 16px, background `--bg-surface`, no drop shadow (shadows are invisible on dark backgrounds and add unnecessary rendering cost). Cards are for the Story Card (title + cover art + moral) and the Lesson Log entries. Everything else uses inline layout.

- **Chip (choice chip):** Rounded 24px (pill shape), background `--bg-element` when unselected, category tint when selected, border 1px `--border-subtle`. The chip is the primary interactive element in the app — it must feel tappable, not decorative. Height: 40px minimum.

- **Iconography:** SF Symbols (iOS) / Material Symbols (Android), weight "regular" (24px default). Icons are used only for playback controls (play, pause, skip) and navigation (back arrow). No decorative icons. No emoji in UI chrome — emoji appear only in the post-story feedback mechanic where they're functional (Great / Okay / Missed the mark).

- **Press feedback:** Every interactive element (buttons, chips, cards with tap actions) uses the same press effect — background shifts to the next elevation step on the neutral scale (`--bg-element` → `--bg-element-hover` for buttons/chips, `--bg-surface` → `--bg-element` for cards). No opacity dimming, no scale transforms, no haptic feedback. The background shift is the only signal. Duration: 150ms, easing: `withTiming()` from Reanimated. On release, the element returns to its resting state over the same duration. The press state should feel like the element warms slightly — not like it's being squashed or flickered.

## 4. Accessibility

- **Text contrast:** All text meets WCAG AA. Primary text (`#E2E0F0` on `#0F1328`) ≈ 11.8:1. Secondary text (`#8E8AA8` on `#0F1328`) ≈ 5.0:1. Both exceed 4.5:1 minimum.
- **Motion:** The loading screen's breathing pacer animation respects reduced-motion preferences via `AccessibilityInfo.isReduceMotionEnabled()`. All screen transitions use crossfade (200ms), never slide or bounce. The sleep mode transition fades to black over 1000ms.
- **Focus indicators:** On platforms with keyboard/switch control, interactive elements show a 2px border in `--text-secondary` with 2px offset when focused. On phone-only use, the press feedback (background elevation shift) serves as the primary interaction cue.
- **Alt text:** Cover art alt text describes the scene (e.g., "Watercolor illustration of a bear in a forest clearing") — never says "image" or "cover art." Challenge chips are self-labeling and need no additional alt text.

## 5. Voice & Tone

- **Register:** Warm, direct, unhurried. Like a trusted friend, not a brand.
- **Sentence rhythm:** Short. Most UI copy is under 8 words. Instructions are one sentence. No paragraphs in UI.
- **Words this brand uses:** "Tonight's story," "Let's try," "Goodnight," "Nice choice," "Ready when you are."
- **Words this brand refuses:** "Magic" (except in the app name — overused in kids' products), "Journey," "Unlock," "Elevate," "Seamless," "Empower," "Delight."
- **Address:** "You" — direct, singular. Never "parents" or "users." The app speaks to one person.

## 6. Implementation Practices

- **Token format:** TypeScript constants in `src/constants/theme.ts`. Colors, spacing, and fonts exported as typed objects. No CSS variables (React Native doesn't use CSS).
- **Component library convention:** `@expo/ui` universal components for native feel (SwiftUI on iOS, Jetpack Compose on Android). React Native `StyleSheet` for layout. No third-party UI kit.
- **Image treatment:** Cover art is AI-generated watercolor children's book illustration, displayed at 1:1 aspect ratio on the Story Card, no border radius on the image itself (the card's rounded corners clip it). No other images in the app.
- **Grid system:** No formal grid. Single-column vertical stack for all screens. Content is centered with max-width 800px on larger devices.
- **Motion rules:** Easing: `ease-out` for all transitions. Duration: 150ms for micro-interactions (chip tap, button press), 200ms for screen transitions, 1000ms for sleep mode fade. No spring animations. No bounce. The motion language is "settle" — everything slows down, nothing pops. In Reanimated, use `withTiming()` exclusively — never `withSpring()`, which defaults to bounce.
- **Orientation:** Portrait-locked. The app never rotates. Set via `expo-screen-orientation` or `app.json` `orientation` field.
- **Safe areas:** All screens respect safe area insets. Content does not bleed into the status bar or home indicator area. Use `SafeAreaView` from `react-native-safe-area-context`. On screens with a visible header, the header sits below the safe area; on immersive screens (player, sleep mode), content extends edge-to-edge with the status bar overlaid.
- **Status bar:** `expo-status-bar` with `style="light"` globally. On Android, translucent status bar with `backgroundColor` set to `--bg-base` to avoid a visible seam.
- **Splash screen:** `expo-splash-screen` background is `--bg-deepest` (#060A1A). No logo flash, no brand moment — the parent opens the app in a dark room and the first thing they see is the home screen, not a splash.

## 7. Anti-Patterns

- **No gradient backgrounds.** Purple-blue-cyan gradients are the default slop of every wellness and AI app. The background is always solid `--bg-base` or `--bg-deepest`.
- **No card grids for feature display.** The app has no "features" screen. If it did, inline typographic rhythm would replace any grid.
- **No emoji in UI chrome.** Emoji appear only in the post-story feedback mechanic (Great / Okay / Missed the mark) where they're functional input, not decoration. No emoji on buttons, headers, or empty states.
- **No gamification.** No streaks, badges, points, levels, or progress bars. This is a sleep tool, not a dopamine loop. The Lesson Log tracks behavior gently, not competitively.
- **No bright or saturated fills.** Category colors are used as tints (low-opacity overlays), never as solid button backgrounds or section fills. A `#60A5FA` button on a dark background would be visually aggressive in a sleep context.
- **No "Generate Magic" copy with sparkle emoji.** The PRD specifies this button text, but the DESIGN.md records it as a known tension — it's the one place the app leans playful. If it feels wrong in testing, "Create Tonight's Story" is the fallback.
- **No empty states that say "No stories yet."** The empty history vault should show the primary action ("Create your first story") with a hint of what will appear.

## 8. Decision-Making

When design principles conflict, resolve in this order:

1. **Sleep hygiene is non-negotiable.** If a visual choice would increase arousal (bright color, busy animation, high contrast pattern), it gets cut regardless of how "delightful" it might feel. The child is trying to fall asleep.
2. **Accessibility floor is not negotiable.** If a color choice fails contrast, change the color, not the requirement. The dark-mode palette makes this harder — every accent must be tested against `--bg-base`.
3. **Cognitive load reduction over information density.** When in doubt, show fewer options, fewer words, fewer elements. The parent is exhausted. One clear action beats three decent options.
4. **Tap-first, always.** If a flow requires keyboard input (except nickname and auth), redesign the flow. Choice chips, toggles, and selection sheets replace every text field.
5. **Restraint over completeness.** The app does one thing well: it generates a bedtime story. Every screen should reinforce that single purpose. Features that don't directly serve tonight's story belong in V2.
6. **Platform-native over brand-consistent.** Use native navigation patterns (iOS back swipe, Android back button) even if they differ from the "ideal" brand layout. The parent shouldn't have to learn a new interaction model at 8pm.

## 9. Workflow

When producing a new screen or feature for Bedtime Magic:

1. Read the PRD section that defines the feature. Identify the 90% state (what the user does most of the time on this screen).
2. Write the screen's content hierarchy in plain text — what the user needs to know, in what order, before any visual work.
3. Map the hierarchy to the component seeds: which elements are chips, which are buttons, which are cards, which are inline text.
4. Apply the dark palette: `--bg-base` background, `--bg-surface` for elevated elements, category accent only on the active/selected element.
5. Test text contrast for every text/background pair against WCAG AA.
6. Anti-pattern pass: check against the refusals list. Flag any gradient, emoji decoration, bright fill, or keyboard input.
7. Verify touch targets: every interactive element is ≥44pt. Chip spacing is ≥8px.
8. Ship.
