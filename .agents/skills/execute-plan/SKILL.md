---
name: execute-plan
description: Use when you have a written implementation plan and need to execute it through completion
---

# Execute Plan

## Overview

Execute a written implementation plan through completion while preserving correctness, verification, and progress.

Work through the plan continuously. Execute tasks directly or delegate when that improves focus or efficiency. Subagents are an implementation technique, not a separate execution workflow.

**Core principle:** Execute the plan, verify the work, adapt when reality requires it, and keep moving unless progress genuinely requires user input.

## 1. Prepare

Before implementation:

1. Read the complete plan.
2. Understand the goal, constraints, dependencies, and verification requirements.
3. Inspect the relevant codebase context as needed.
4. Ensure the work is being performed in an appropriate isolated branch or workspace when the project workflow requires one.
5. Create or update task tracking from the plan.

Review the plan critically before starting.

Resolve minor omissions or implementation details using the codebase, requirements, and engineering judgment.

Do not silently change the intended behavior or scope.

If the plan contains a fundamental contradiction, depends on unavailable information, or leaves no reasonable implementation path, surface the blocker before proceeding.

## 2. Execute Tasks

Work through the plan in dependency order.

For each task:

1. Mark it in progress.
2. Inspect the relevant existing implementation before editing.
3. Implement the required change.
4. Follow applicable project conventions and referenced skills.
5. Run the task's specified verification.
6. Fix failures caused by the implementation.
7. Mark the task complete only after its required verification succeeds.

Continue to the next task without asking for permission merely because a task completed.

The user already asked for the plan to be executed.

### Adapt When Necessary

A plan is a guide to the intended implementation, not a substitute for observing the codebase.

You may make small implementation-level adjustments when repository reality differs from the plan, such as:

* paths or symbol names having changed;
* an equivalent existing abstraction being more appropriate;
* a planned step already being satisfied;
* an additional small change being required for correctness;
* verification requiring a minor supporting adjustment.

Preserve the plan's intent and scope.

If an adjustment materially changes architecture, product behavior, requirements, or scope, stop and raise it rather than quietly rewriting the plan.

## 3. Delegate When Useful

If subagents or equivalent isolated workers are available, use them when delegation meaningfully improves execution.

Good delegation candidates include:

* independent tasks;
* focused implementation work;
* repository exploration;
* investigation of unfamiliar components;
* isolated test or verification work.

Do not delegate merely because delegation is available.

Keep tightly coupled work together when splitting it would create unnecessary coordination or duplicated context.

### Delegation Context

Give a delegated worker only the context needed for its task:

* the task and expected outcome;
* relevant plan requirements;
* relevant files or interfaces;
* constraints and conventions;
* required verification.

Do not dump the entire session history into the worker.

The primary agent remains responsible for integrating the result, checking it against the plan, and verifying the resulting codebase.

A subagent's claim that a task is complete is not verification.

## 4. Handle Problems During Execution

Do not stop for ordinary implementation decisions that can be resolved safely from the plan, codebase, tests, and established conventions.

Use engineering judgment and continue.

Stop and ask only when proceeding would require an unjustified guess about something material, such as:

* contradictory or fundamentally incomplete requirements;
* a product or architectural decision the plan does not authorize;
* required credentials, secrets, data, or external access that are unavailable;
* an irreversible or destructive action requiring approval;
* an external side effect that normally requires user authorization;
* a security-sensitive decision requiring user input.

When verification fails, investigate before treating the failure as a blocker.

Determine whether the failure comes from:

* the implementation;
* an incorrect assumption in the plan;
* the existing codebase or environment;
* an unrelated pre-existing failure.

Fix problems within the implementation scope when possible and continue.

Do not guess through genuine blockers.

## 5. Verify Completion

After all plan tasks are implemented, perform final verification appropriate to the change.

At minimum:

1. Run the plan's required tests and checks.
2. Run relevant broader tests when practical.
3. Check that all planned tasks are actually complete.
4. Inspect the resulting diff for accidental or unrelated changes.
5. Confirm there are no known verification failures introduced by the work.

Do not claim completion based only on code inspection or an implementer's report when executable verification is available.

If verification fails because of the implementation, fix the problem and rerun the affected checks.

If a failure is demonstrably pre-existing or unrelated, report it clearly rather than silently treating it as success.

## 6. Code Review

Successful execution does not automatically require a separate code-review workflow.

After implementation and verification, offer an independent code review when it would provide meaningful additional confidence, particularly for substantial, risky, or merge-bound changes.

If the user requests review, use `request-code-review`.

Do not invoke it merely because this skill completed.

### Handling Review Findings

When review feedback is available:

1. Understand each finding.
2. Verify it against the actual code and requirements.
3. Determine whether the finding is technically valid and in scope.
4. Implement valid findings.
5. Reject or explain findings that are incorrect or conflict with the requirements.
6. Rerun verification affected by each change.

Do not implement reviewer suggestions blindly.

Review feedback is evidence to evaluate, not an automatic instruction to modify the code.

If fixes materially change the implementation, rerun the appropriate final verification before considering the work complete.

## 7. Finish

Once the plan is implemented and verification passes:

1. Summarize what was completed.
2. Report relevant verification performed and its result.
3. Mention any unresolved or pre-existing issues that materially affect the work.
4. Offer code review if appropriate and not already performed.
5. Proceed with the project's normal branch-completion or handoff workflow when requested or when an applicable finishing skill governs that step.

Do not merge, push, publish, deploy, or perform other consequential external actions unless they are already authorized by the user's request or established workflow.

## Remember

* Read the entire plan before executing.
* Execute continuously rather than checking in after every task.
* Use subagents selectively; they are not a separate workflow.
* Preserve the plan's intent while adapting to repository reality.
* Verify work before marking it complete.
* Investigate failures instead of blindly retrying or guessing.
* Stop only for genuine blockers or actions requiring authorization.
* Code review is available after execution, not automatically mandatory.
* Verify review feedback before implementing it.
* The primary agent owns the final result.
