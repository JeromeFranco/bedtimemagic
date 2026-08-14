# Session-Scoped Story Generation Status

Status: Approved design  
Date: 2026-08-13  
Scope: MVP UX and client-side lifecycle for story generation

## Summary

Story generation should continue when a parent leaves the generation screen, while remaining visible and controllable elsewhere in the app. The app will own one active generation request at session level, show an indeterminate global status, and let the parent explicitly stay, keep creating in the background, or cancel.

This design intentionally covers only the current app process. It does not promise recovery after the app is force-quit, terminated, or relaunched.

## Problem

The generation screen currently owns the request and displays the only progress indication. If a parent navigates back while generation is in progress, the request may continue without visible status or an obvious way to cancel it. A successful request can also navigate after the parent has deliberately left the screen.

For an MVP, parents need clear control and feedback without introducing durable jobs, queues, realtime subscriptions, or database changes.

## Goals

- Keep an active generation visible while the parent uses another app screen.
- Make leaving an active generation an explicit choice.
- Prevent duplicate story requests within the same app session.
- Preserve the child and prompt inputs captured when generation starts.
- Let the parent decide when to open a completed story after leaving.
- Support best-effort cancellation with honest user-facing semantics.
- Keep the solution small, idiomatic, and entirely client-side apart from the existing request.

## Non-goals

- Persisting generation state across app termination or relaunch.
- Durable background jobs, queues, workers, polling, or Realtime.
- Operating-system background execution guarantees.
- Multiple concurrent story generations.
- Numeric or percentage progress.
- Push or local notifications.
- Automatic retries.
- Database or Edge Function schema changes.
- Completion sounds or detailed technical error messages.

## Terminology

- **Story Generation:** A parent-initiated request to create one personalized story.
- **Active Story Generation:** A request that has started but has not completed, failed, or been cancelled.
- **Generation owner:** The child selected when the request begins. Changing the selected child later does not change ownership of the active or completed result.

## Experience Design

### Starting generation

When a parent selects a challenge, the app starts one generation request using a snapshot of the selected child and prompt inputs. The generation screen shows the existing calming animation.

While a request is active, the app must not start another request. Any entry point that would begin generation should instead take the parent to the active generation status.

### Leaving while generation is active

The generation screen must provide a visible way to leave in addition to handling the platform back action. Either action opens a confirmation with three choices:

- **Stay:** Close the confirmation and remain on the generation screen.
- **Keep Creating:** Return to the previous screen while the request continues.
- **Cancel Story:** Attempt to abort the request, clear its active UI, and return to the previous screen.

The confirmation must not imply that navigating away inherently cancels the request.

### Global generating status

After **Keep Creating**, show a compact status surface above the app tabs on ordinary Home and Vault screens. It uses an indeterminate activity indicator and child-specific copy such as:

> Writing Mia's story…

Tapping the status returns to the generation screen, which resumes showing the full calming state without starting a second request.

Do not display a percentage or time estimate because the current one-shot request has no reliable incremental progress.

### Successful completion

If generation succeeds while the parent remains on the generation screen, open the generated story as the current flow does.

If generation succeeds after the parent has left:

- Do not automatically navigate or interrupt the parent's current task.
- Refresh the story cache so the new story appears in the Vault.
- Change the global status to a ready state such as `Mia's story is ready` with a **Listen** action.
- Open the story only when the parent taps the ready status or **Listen**.
- Allow the ready status to be dismissed; dismissing it does not delete the story.

### Failure

If generation fails while the parent remains on the generation screen, show the existing calm error experience with **Try Again** and **Go Back**.

If it fails after the parent has left, change the global status to a calm failure state with:

- Generic copy such as `We couldn't finish Mia's story.`
- **Try Again**, which retries from the captured inputs if no other generation is active.
- **Dismiss**, which clears the failure status.

Technical error details remain available for diagnostics but are not shown to the parent.

### Cancellation

Cancellation is best effort. The client aborts the active request and immediately treats the generation as cancelled for navigation and UI purposes.

The server may finish and persist the story if completion wins a race with cancellation. If that happens, the result remains valid and may appear in the Vault after its next refresh. The app must not claim that cancellation guarantees deletion or that server work certainly stopped.

### Story playback

Do not show generation status or trigger generation-completion haptics over the story playback experience. A completed story remains discoverable in the Vault after playback ends.

No completion sound is used.

## Client Design

### Ownership

Move request ownership from the route-local generation screen to a provider mounted within the existing app-level provider tree. The provider remains alive while the parent navigates between Home, Vault, generation, and story routes.

The generation screen becomes a consumer of this shared lifecycle rather than the owner of a separate mutation.

### State model

The coordinator exposes one session-scoped lifecycle:

- `idle`
- `generating`
- `ready`
- `failed`

The lifecycle data includes only what the UI and retry flow require:

- Captured child identity and display name.
- Captured generation inputs.
- Whether the parent has left the generation screen.
- The completed story when ready.
- A user-safe failure state when failed.
- The active cancellation controller while generating.

Cancellation returns the lifecycle to `idle`. Dismissing a ready or failed status also returns it to `idle` without altering persisted stories.

### Request and navigation flow

1. The Home screen requests generation with the current child and prompt inputs.
2. The coordinator rejects or redirects duplicate starts while one request is active.
3. The app opens the generation screen, which renders the coordinator state.
4. The coordinator invokes the existing story API with an abort signal.
5. On success, the coordinator refreshes story queries and records the completed story.
6. The generation screen opens the story only if the parent is still intentionally waiting there.
7. Otherwise, the global status changes to ready and waits for parent action.

Navigation is an effect of the visible screen and parent intent; request completion itself must not globally force navigation.

### API boundary

Extend the story-generation API function to accept an optional `AbortSignal` and pass it through the supported Supabase invocation options. The coordinator owns the associated `AbortController`.

The request should not be cancelled merely because the generation screen unmounts. Only the explicit **Cancel Story** action cancels it.

### Global status placement

Render the shared status at an app-level location that can appear above the native tabs while ordinary tab content is visible. Keep its visuals consistent with the existing dark theme and accessible touch targets.

Hide the status while the generation screen or story playback screen already supplies the relevant focused experience.

## Edge Cases

- If the selected child changes during generation, status copy and the completed story continue to refer to the child captured at start.
- Returning to the generation screen reconnects to the active request and never starts it again.
- Repeated taps on a generation entry point cannot create duplicate requests.
- Repeated cancellation is safe and does not act on a later request.
- A late success or failure from an obsolete or cancelled request cannot overwrite the current lifecycle.
- A retry reuses the captured inputs so it does not silently switch children or challenges.
- If the app process terminates, in-memory status is lost. On relaunch, any server result that was persisted remains discoverable through the Vault.
- If cache refresh fails after successful persistence, the ready action can still open the returned story; later Vault refreshes may recover the listing.

## Accessibility and Copy

- Status changes are announced accessibly without repeatedly interrupting the parent.
- Activity UI has a meaningful label and does not rely on animation alone.
- Buttons use clear verbs: **Stay**, **Keep Creating**, **Cancel Story**, **Listen**, **Try Again**, and **Dismiss**.
- Touch targets meet the app's existing accessibility conventions.
- Copy uses the captured child's display name when available and falls back to neutral wording when it is not.

## Testing Strategy

Focused tests should cover the lifecycle across the coordinator, generation screen, global status, navigation, query cache, and API cancellation boundary.

Required behaviors:

- Starting captures the selected child and inputs once.
- A second start cannot create a concurrent request.
- **Stay** preserves the full generation screen.
- **Keep Creating** leaves the screen, keeps the request alive, and shows global generating status.
- Tapping generating status returns to the existing request.
- Success while waiting opens the story once.
- Success after leaving does not redirect, refreshes story data, and presents **Listen**.
- Failure after leaving presents **Try Again** and **Dismiss**.
- Retry uses captured inputs and starts only one new request.
- Explicit cancellation passes an abort signal and clears active UI.
- Late settlement from an obsolete request cannot change current state or navigate.
- Status is hidden during story playback.
- Relaunch recovery is not represented as supported behavior.

## Acceptance Criteria

- A parent can leave active generation without losing awareness of it.
- Leaving never silently cancels and completion never unexpectedly redirects a parent who left.
- A parent can return to, cancel, retry, dismiss, or open the result from clear controls.
- Only one story generation is active per app session.
- Progress remains indeterminate and honest.
- The solution adds no durable job infrastructure or schema changes.
- Existing generation success, story playback, and Vault discovery continue to work.

## Future Upgrade Trigger

Replace this session-scoped design with a durable job model only if product requirements demand reliable recovery after app termination, cross-device visibility, guaranteed background completion, or multiple queued generations.
