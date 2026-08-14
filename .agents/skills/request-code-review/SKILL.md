---
name: request-code-review
description: Use when you want a focused review of code changes against requirements and code quality before proceeding, merging, or handing off
---

# Request Code Review

## Overview

Review a defined set of code changes against their requirements and the surrounding codebase, then return clear, actionable findings. Prefer a separate reviewer context when available so the review is independent from the implementation context.

**Core principle:** Review the work product against the requirements and evidence, not the implementer's reasoning.

This skill performs the review. It does not own implementation of the resulting fixes.

## 1. Define the Review Scope

Before reviewing, establish:

* what was implemented;
* the requirements, plan, issue, or expected behavior;
* which code changes are in scope;
* any relevant constraints or known tradeoffs.

Use the narrowest review scope that completely represents the change.

The scope may be expressed as:

* a commit range;
* a pull request or branch diff;
* staged changes;
* working-tree changes;
* specific files or components.

Do not require commits merely to make review possible.

If requirements are unavailable, infer expected behavior only when it is reasonably clear from the codebase and request. State any material assumptions.

## 2. Use an Independent Reviewer When Available

If the environment supports subagents or isolated reviewer contexts, delegate the review to a fresh reviewer.

Provide only the context needed to evaluate the work:

* implementation summary;
* requirements or plan;
* review scope;
* relevant constraints.

Do not pass the full implementation-session history unless it contains information genuinely required to judge correctness.

The reviewer should inspect the actual code and repository context rather than relying on the implementation summary.

Use the reviewer guidance in `code-reviewer.md` when delegating.

If no separate reviewer context is available, perform the review directly using the same review criteria. Do not skip review solely because delegation is unavailable.

When reviewing directly, recognize that the review is not fully independent and compensate by checking the diff and requirements systematically.

## 3. Review the Changes

Evaluate the implementation for issues that materially affect correctness or maintainability.

Check as applicable:

### Requirements

* Does the implementation satisfy the stated requirements?
* Is required behavior missing?
* Does it introduce behavior outside the intended scope?
* Are deviations from the plan or requirements justified?

### Correctness

* Are there logic errors or broken edge cases?
* Are errors and failure paths handled correctly?
* Could the change corrupt, lose, leak, or incorrectly transform data?
* Are concurrency, lifecycle, or state-management concerns handled where relevant?

### Integration and Architecture

* Does the change integrate correctly with surrounding code?
* Are responsibilities placed in appropriate components?
* Does it preserve important interfaces and invariants?
* Does it introduce unnecessary coupling or complexity?

### Security and Safety

* Does the change introduce security vulnerabilities?
* Are authentication, authorization, validation, secrets, and sensitive data handled appropriately?
* Could external inputs or side effects behave unsafely?

### Testing

* Do tests cover the behavior that changed?
* Are important failure paths and edge cases tested?
* Are tests meaningful rather than merely exercising mocks or implementation details?
* Are relevant verification results available?

### Maintainability

* Is the implementation understandable and appropriately scoped?
* Is duplication significant enough to matter?
* Are abstractions justified by the current change?
* Are comments or documentation needed for non-obvious behavior?

Prioritize substantive defects over stylistic preferences.

Do not invent issues merely to make the review appear thorough.

## 4. Report Findings

Report findings in descending severity.

Use these categories:

### Critical

Problems that can cause severe failures such as:

* security vulnerabilities;
* data loss or corruption;
* fundamentally broken required behavior;
* serious production outages or unsafe behavior.

### Important

Problems that should normally be resolved before the change is considered ready, such as:

* incorrect behavior;
* missing requirements;
* significant edge-case failures;
* meaningful architectural problems;
* inadequate error handling;
* important test gaps.

### Minor

Non-blocking improvements such as:

* small maintainability issues;
* localized simplifications;
* documentation improvements;
* low-impact polish.

For each finding, include:

1. **Location** — file and line or the narrowest useful reference.
2. **Problem** — what is wrong.
3. **Impact** — why it matters.
4. **Recommendation** — how to address it when the fix is not obvious.

Do not assign high severity to style preferences or speculative concerns.

If there are no substantive findings, say so clearly.

## 5. Give an Assessment

Finish with a concise assessment of the reviewed change.

Use one of:

* **Ready** — no Critical or Important findings.
* **Ready with minor improvements** — only Minor findings remain.
* **Needs changes** — one or more Critical or Important findings should be addressed.

Base the assessment only on the reviewed scope.

Do not claim the entire project or branch is ready if only part of it was reviewed.

## 6. Return Control

After reporting the review, return the findings to the caller or user.

Do not automatically modify the implementation.

The workflow that requested the review owns what happens next.

When review findings are handled during plan execution, `execute-plan` should verify each finding against the code and requirements, implement valid fixes, and rerun affected verification.

## Remember

* Review against requirements and actual code.
* Keep review scope explicit.
* Prefer a fresh reviewer context when available.
* Do not require a particular subagent mechanism.
* Do not require committed changes.
* Prioritize correctness over style.
* Use severity according to real impact.
* Be specific and actionable.
* Do not manufacture findings.
* Reviewing and fixing are separate responsibilities.