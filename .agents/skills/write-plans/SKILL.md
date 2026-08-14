---
name: write-plans
description: Turn an approved design or clear requirements into an executable implementation plan.
---

# Writing Plans

Create an implementation plan that lets an executor implement the approved
design without rediscovering architectural intent or making unspecified
product decisions.

Do not implement code while writing the plan.

## Workflow

1. Read the approved design/spec or requirements.

2. Inspect the relevant code, tests, project structure, and conventions before
   choosing files or task boundaries. Do not invent paths or APIs from the
   design alone.

3. Validate scope.
   - If the work contains independently deliverable subsystems, prefer separate
     plans unless keeping them together materially simplifies implementation.
   - If planning exposes a design-level contradiction or missing decision,
     surface it instead of silently redesigning the feature.

4. Break the work into coherent, independently understandable and verifiable
   tasks.
   - Keep tightly coupled changes together.
   - Split where there is a meaningful implementation or verification boundary.
   - Do not create micro-tasks purely for delegation or review.

5. For each task include what the executor actually needs:
   - outcome;
   - files or symbols to create/modify;
   - important dependencies on earlier tasks;
   - exact interfaces, schemas, or commands when they are not obvious;
   - implementation guidance for non-obvious decisions;
   - verification.

   Use code or pseudocode only when it resolves ambiguity. Do not reproduce
   straightforward implementation code that can be derived from the repository.

6. Prefer test-first implementation when behavior can be usefully specified by
   an automated test. Otherwise specify the appropriate build, test, lint, or
   manual verification.

7. Do not leave material TODOs, placeholders, vague edge-case instructions, or
   undefined interfaces in the plan.

8. Before saving, verify:
   - every approved requirement is represented;
   - task ordering and interfaces are consistent;
   - no material implementation decision has accidentally been left to the
     executor.

## Plan Format

Save to:

`docs/plans/YYYY-MM-DD-<feature-name>.md`

unless the user or project specifies another location.

Suggested structure:

# <Feature> Implementation Plan

**Goal:** <one sentence>

**Design:** <spec path, when one exists>

**Constraints:** <only non-obvious constraints that affect multiple tasks>

### Task 1: <Outcome>

**Files / symbols**
- Modify: `path/to/file` — `RelevantType.method`
- Test: `path/to/test`

**Implementation**
- <necessary implementation guidance>
- <exact interface or dependency when relevant>

**Verify**
- `<command>`
- <expected behavior>

## Execution Handoff

After saving the plan, choose an execution strategy based on its structure:

- Use inline execution for small plans or tightly coupled tasks where shared
  context is valuable.
- Use subagent-driven execution for larger plans with multiple mostly
  independent tasks where context isolation and independent review materially
  help.

For medium-sized or coupled work, consider inline implementation with a fresh
review subagent afterward.

Recommend the most appropriate mode and briefly explain why. Ask the user only
when the trade-off is genuinely close.