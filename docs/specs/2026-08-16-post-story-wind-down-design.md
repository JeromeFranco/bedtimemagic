# Unified Post-Story Wind-Down

Status: Approved design  
Date: 2026-08-16  
Scope: Story-player transition through Pillow Talk, affirmation, fade-out, and return navigation

## Summary

The story player will remain mounted after narration ends and progressively settle into one unified wind-down experience. The sequence is Pillow Talk, affirmation, a deterministic fade to black, and return to the screen that opened the story.

The design replaces the current standalone post-story screens and the duplicate wind-down implementation inside `StoryPlayer` with one production path. It favors visible, explicit actions over hidden controls and gestures, preserves audio and visual continuity, and makes final navigation independent of ambient-audio availability.

## Problem

The current story route and player contain two competing post-story experiences:

- `story.tsx` replaces `StoryPlayer` with standalone `PillowTalk` and `Affirmation` screens.
- `StoryPlayer` also contains an integrated Pillow Talk, affirmation, and fade-to-black flow, but the route stops rendering it when those phases begin.

The implementations have diverged. In the active standalone flow, **Next** and **Skip for tonight** perform the same transition, while **Goodnight** returns immediately without the integrated fade. In the integrated flow, controls auto-hide, directional gestures duplicate the buttons, the Pillow Talk gesture hint conflicts with the implemented swipe direction, and a foreground curtain dims text and controls along with the background.

The result is an abrupt and ambiguous closing sequence at the point where the app should be most predictable and low-stimulus.

## Goals

- Preserve visual and audio continuity from narration through the final exit.
- Provide a clear two-step reflection and reassurance sequence.
- Make every action's destination explicit.
- Let a parent skip the remaining wind-down without ambiguity.
- Fade to black before returning to Home or Vault.
- Keep all actions visible and accessible for an unbounded conversation length.
- Use one post-story implementation and one state transition path.
- Make cleanup, fade completion, and navigation deterministic and idempotent.
- Respect reduced-motion settings and the existing design system.

## Non-goals

- Adding a sleep timer, white-noise timer, or locked sleep screen.
- Keeping the app on a permanent black screen after Goodnight.
- Changing story generation or the generated Pillow Talk and affirmation fields.
- Adding progress, rewards, completion celebrations, or new decorative effects.
- Adding new color, spacing, radius, or typography tokens.
- Redesigning ordinary story playback controls.
- Supporting multiple post-story sequences or user-configurable wind-down steps.

## Experience Design

### End-to-end flow

```text
Story playback
    ↓ story audio settles
Pillow Talk
    ├─ Show affirmation → Affirmation
    └─ Skip wind-down ───→ Fade to black
                              ↓
Affirmation
    └─ Goodnight ─────────→ Fade to black
                              ↓
                    Return to Home/Vault
```

The story route remains open for the entire sequence. It returns with the existing back-stack behavior only after the final curtain has completed.

### Transition from playback

When narration finishes:

- Playback controls and the sleep-mode toggle leave the focused surface.
- The square artwork animates to a compact size of approximately 160pt.
- The artwork and background dim while foreground text and actions retain their normal token colors and contrast.
- Soft ambient audio begins when post-story content is available.
- If sleep mode was active, the post-story content wakes in gently rather than appearing abruptly over the dark overlay.

The existing back affordance stays in its stable location. During the post-story sequence, it finishes the wind-down through the same fade-and-return path instead of navigating to a bright screen immediately.

### Pillow Talk

The Pillow Talk phase uses this visual order:

1. Compact, dimmed story artwork.
2. A small muted label: **Pillow talk**.
3. The generated question in centered heading-sized text.
4. A subtle breathing pacer.
5. Primary action: **Show affirmation**.
6. Secondary or ghost action: **Skip wind-down**.

**Show affirmation** advances to the affirmation. **Skip wind-down** skips all remaining post-story content and starts the terminal fade.

The actions remain visible while the family talks. The screen does not auto-hide controls, impose a timer, or imply that the question must be answered.

### Affirmation

On entry:

- Pillow Talk content crossfades to the affirmation.
- The artwork softly fades away, lowering visual stimulation.
- The background settles toward `bg-deepest`.

The phase uses this visual order:

1. A small muted label: **Say together**.
2. The generated affirmation in centered heading-sized text.
3. A slightly larger breathing pacer.
4. Primary action: **Goodnight**.

Ambient audio continues without restarting. **Goodnight** starts the terminal fade.

### Fade and return

The terminal action uses a full-screen `bg-deepest` curtain:

- The screen fades to black over approximately one second, matching the design system's sleep fade.
- Ambient audio fades in parallel on a best-effort basis.
- Input is disabled as soon as the fade begins.
- Playback resources are cleaned up once.
- The route returns to its existing Home or Vault origin only after the visual fade duration completes.

The visual timing must not depend on whether an ambient player exists or whether audio cleanup completes synchronously. Missing or failed ambient audio must still produce the full visual fade before navigation.

## Interaction Model

Visible buttons are the only advertised way to advance or finish the sequence. Remove post-story swipe hints, swipe-to-advance behavior, and tap-anywhere control toggling.

This avoids multiple competing interaction models and preserves predictable screen-reader and switch-control behavior. It also removes the directional mismatch in the current Pillow Talk gesture.

All touch targets use the existing button primitives and meet the 44×44pt minimum. Repeated actions during `fade_to_black` have no effect.

## Visual System

The wind-down uses existing theme tokens only:

- `bg-base` and `bg-deepest` for the progressive background.
- `text-primary`, `text-secondary`, and existing button tokens for accessible foreground content.
- Existing spacing, typography, and radius tokens.
- The bedtime accent only through its existing low-opacity breathing-pacer treatment.

Background dimming must sit behind the textual content and actions. A foreground overlay must not reduce their contrast.

The breathing pacer has no shadow or elevation. This aligns with the design system's flat dark-surface rules.

Content remains a centered single column with safe-area handling and the established larger-screen width constraint. Bottom actions remain reachable on the smallest supported phone without covering the prompt or affirmation.

## Motion and Accessibility

Phase changes use restrained opacity transitions rather than directional slides. Motion uses `withTiming` and ease-out or ease-in-out timing; no springs or scale-pop effects are introduced.

Reduced-motion behavior:

- The breathing pacer becomes static.
- Artwork resizing and phase changes do not use directional movement.
- The terminal opacity curtain remains, because it prevents an abrupt bright destination, but contains no translation or scale motion.

Accessibility behavior:

- On phase change, screen-reader focus or an announcement identifies **Pillow talk** or **Say together** and then exposes the generated text.
- Actions use their visible labels as accessible names.
- Hidden outgoing content is removed from the accessibility tree.
- The screen does not rely on motion, gesture hints, or color alone to communicate progression.
- Foreground text and controls retain the contrast required by `DESIGN.md` throughout dimming.

## Client Design

### Single render path

After story data loads, `story.tsx` renders `StoryPlayer` for playback and every post-story phase. It no longer branches to standalone `PillowTalk` or `Affirmation` screens.

`StoryPlayer` owns the visual response to the shared player phase. The player context remains responsible for audio lifecycle and phase transitions. The route remains responsible for returning through the router when the context reaches `done`.

Standalone post-story components and tests are removed if no callers remain. Shared presentation code may remain only where it serves the unified player path; there must not be a second independently styled flow.

### State model

The existing phase model remains conceptually:

- `idle`
- `fading`
- `pillow_talk`
- `affirmation`
- `fade_to_black`
- `done`

Transitions are:

```text
idle → fading → pillow_talk → affirmation → fade_to_black → done
                    │              │
                    └──────────────┴──── finish wind-down
```

If the prompt is absent, the story advances directly to affirmation. If the affirmation is also absent, it advances directly to `fade_to_black`. Although persisted stories currently require both values, the client handles incomplete legacy or malformed data without rendering an empty phase.

### Action semantics

Use explicit transition semantics rather than one ambiguously named skip action:

- An advance action moves from Pillow Talk to affirmation.
- A finish action moves from either content phase to `fade_to_black`.
- A fade-completion action performs final cleanup and moves to `done`.

Back during ordinary playback keeps its existing stop-and-return behavior. Back during Pillow Talk or affirmation invokes the finish action. All finish entry points converge on the same idempotent operation.

The implementation should remove obsolete context methods after migrating every caller rather than retain compatibility aliases.

### Audio lifecycle

At narration completion:

- Story narration completes its existing fade and releases its playlist.
- Ambient audio starts once when any post-story content will be shown.
- Advancing from Pillow Talk to affirmation does not restart ambient audio.
- Finishing fades ambient audio in parallel with the visual curtain.
- Final cleanup cancels pending story synthesis and releases playlist and ambient resources once.

A generation or operation identifier continues to prevent late audio events from restoring obsolete playback state.

### Navigation ownership

The visual player must remain mounted while `fade_to_black` is active. The route navigates only after the shared phase reaches `done`.

Navigation is therefore a consequence of completed wind-down state, not a direct side effect of **Goodnight**, **Skip wind-down**, or post-story Back. This guarantees the approved fade-before-return behavior for stories opened from either Home or Vault.

## Edge Cases

- Missing Pillow Talk prompt skips directly to affirmation.
- Missing affirmation skips directly to the terminal fade.
- Missing both fields performs the terminal fade and returns.
- Ambient-player creation failure does not shorten or skip the visual fade.
- Repeated taps on **Goodnight**, **Skip wind-down**, or Back cannot duplicate cleanup or navigation.
- An artwork load failure uses the existing protagonist placeholder without changing the flow.
- A small screen keeps the prompt readable and actions reachable without automatic control hiding.
- An unusually long generated string wraps within the content column and does not overlap the bottom actions.
- Unmount during any phase still performs defensive audio cleanup.
- Late playlist or ambient events from an obsolete story cannot move the new story's phase.

## Documentation Impact

Update `DESIGN.md` with the unified post-story wind-down pattern when implementing it. The documentation should record:

- Playback, Pillow Talk, affirmation, and fade-out are one progressively dimming surface.
- Post-story actions remain visible.
- Buttons, not hidden gestures, control progression.
- The final return happens only after the sleep fade.
- The breathing pacer is static when reduced motion is enabled and has no shadow.

No new design tokens are required.

## Testing Strategy

Focused behavioral tests must cover the observable contract across the story route, player UI, and player context.

Required behaviors:

- Story completion renders Pillow Talk without replacing the player route surface.
- **Show affirmation** advances exactly once to the affirmation.
- **Skip wind-down** starts `fade_to_black` and never renders the affirmation.
- **Goodnight** starts `fade_to_black`.
- Post-story Back starts the same fade instead of immediately navigating.
- Route navigation occurs only after fade completion.
- Fade completion and navigation occur when no ambient player exists.
- Repeated finish actions produce one cleanup and one navigation.
- Missing prompt and affirmation values select the correct next phase.
- Post-story actions stay rendered rather than disappearing after a timer.
- Reduced motion stops breathing repetition and avoids directional phase movement.
- Foreground content is not placed beneath the dimming curtain.

Visual verification must exercise the real sequence on:

- The smallest supported iPhone.
- A current standard-size iPhone.
- An Android emulator.

Review playback-to-Pillow-Talk continuity, text wrapping, safe areas, button reachability, reduced motion, screen-reader phase changes, final fade timing, and return behavior from both Home and Vault.

After implementation, run the focused tests plus `npm run lint` and `npm run typecheck`.

## Acceptance Criteria

- Narration, Pillow Talk, affirmation, and fade-out render through one player surface.
- The active route contains no competing standalone post-story render path.
- Pillow Talk offers **Show affirmation** and **Skip wind-down** with distinct outcomes.
- Affirmation offers **Goodnight** and then fades to black before returning.
- Back during the post-story sequence uses the same fade-before-return behavior.
- Buttons remain visible for the duration of both content phases.
- No post-story swipe hint, swipe requirement, or tap-to-reveal control remains.
- Text and controls retain accessible contrast while the background dims.
- The breathing pacer respects reduced motion and has no shadow or elevation.
- The final visual fade occurs even when ambient audio is absent or fails.
- Cleanup and navigation occur at most once per wind-down.
- Existing story playback and return-to-origin behavior continue to work.
- `DESIGN.md` and the implemented pattern agree.
