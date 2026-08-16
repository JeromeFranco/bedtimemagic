---
name: execute-plan
description: Use when you have a written implementation plan and need to execute it through completion
---

# Execute Plan

## Overview

Execute a written implementation plan through completion while preserving its intent and verifying the resulting work.

Execute directly or delegate when useful. Subagents are an implementation technique, not a separate workflow.

**Core principle:** Follow the plan, adapt to repository reality when necessary, verify the work, and keep moving unless progress genuinely requires user input.

## 1. Prepare

Before implementation:

1. Read the complete plan.
2. Understand its goal, constraints, dependencies, and verification requirements.
3. Inspect enough of the codebase to execute it safely.
4. Identify any fundamental contradiction or missing decision that prevents execution.

Resolve minor implementation details using the codebase and engineering judgment.

Do not silently change the intended behavior, architecture, or scope.

## 2. Execute

Work through the plan in dependency order.

For each task:

1. Inspect the relevant existing implementation.
2. Implement the required change.
3. Follow applicable project conventions.
4. Run the task's required verification.
5. Fix implementation-caused failures.
6. Mark the task complete only when verification succeeds.

Continue to the next task without asking for permission merely because the previous task completed.

### Adapt When Necessary

Treat the plan as the intended implementation, not a literal script.

Make small adjustments when repository reality differs from the plan, such as renamed symbols, moved files, existing abstractions, already-satisfied steps, or minor supporting changes required for correctness.

Preserve the plan's intent.

If an adjustment materially changes requirements, architecture, product behavior, or scope, stop and surface the decision.

## 3. Delegate Selectively

When isolated workers or subagents are available, delegate independent or focused work when doing so improves execution.

Give delegated workers only the context needed for their task: requirements, relevant files or interfaces, constraints, and verification.

The primary agent remains responsible for integrating and verifying delegated work.

A worker's claim that a task is complete is not verification.

## 4. Handle Blockers

Resolve ordinary implementation decisions autonomously using the plan, codebase, tests, and established conventions.

When something fails, investigate whether the cause is the implementation, the plan, the environment, or a pre-existing problem.

Stop only when continuing requires:

- a material requirement or architectural decision not authorized by the plan;
- unavailable information or access that is necessary to proceed;
- authorization for a consequential external action;
- an unjustified assumption that could materially change the result.

Do not guess through genuine blockers.

## 5. Verify Completion

After all tasks are implemented:

1. Run the plan's required tests and checks.
2. Run relevant broader verification when practical.
3. Confirm every planned task is complete.
4. Inspect the final diff for accidental or unrelated changes.
5. Confirm the work introduced no known verification failures.

Fix implementation-caused failures and rerun affected checks.

Report demonstrably pre-existing or unrelated failures rather than treating them as implementation success or silently fixing unrelated scope.

## 6. Review When Useful

Independent code review is optional, not an automatic requirement.

After successful implementation and verification, offer `request-code-review` when additional confidence would be useful, especially for substantial, risky, or merge-bound changes.

If review findings are returned:

1. Verify each finding against the code and requirements.
2. Implement valid findings.
3. Reject or explain invalid findings.
4. Rerun affected verification.

Do not implement reviewer suggestions blindly.

## 7. Finish

When execution and verification are complete:

- summarize what was implemented;
- report the verification performed and its result;
- mention material unresolved or pre-existing issues;
- offer code review when appropriate and not already performed.

Use the project's normal finishing or handoff workflow when applicable.

Do not merge, push, publish, deploy, or perform other consequential external actions unless already authorized.

## Remember

- Preserve the plan's intent.
- Execute continuously rather than checking in after every task.
- Delegate only when useful.
- Verify implementation rather than trusting completion claims.
- Stop for genuine decisions and blockers, not ordinary engineering work.
- Review is optional; verification is not.