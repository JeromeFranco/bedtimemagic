---
name: request-code-review
description: Use when you want a focused review of code changes against requirements and code quality before proceeding, merging, or handing off
---

# Request Code Review

## Overview

Review a defined set of code changes against their requirements and surrounding codebase, then return clear, actionable findings.

Prefer a separate reviewer context when available so the review is independent from the implementation context.

**Core principle:** Review the work product against the requirements and evidence, not the implementer's reasoning.

This skill performs the review. It does not own implementation of resulting fixes.

## 1. Define the Review Scope

Establish:

- what was implemented;
- the requirements, plan, issue, or expected behavior;
- which changes are in scope;
- relevant constraints or known tradeoffs.

Use the narrowest scope that completely represents the change.

The scope may be:

- a commit range;
- a pull request or branch diff;
- staged changes;
- working-tree changes;
- specific files or components.

Do not require commits merely to make review possible.

If requirements are unavailable, infer expected behavior only when reasonably clear and state material assumptions.

## 2. Perform the Review

If the environment supports an isolated reviewer or subagent, prefer using one.

Provide only the context needed to review:

- implementation summary;
- requirements;
- review scope;
- relevant constraints.

Use `code-reviewer.md` as the reviewer instructions.

If no separate reviewer context is available, perform the review directly using the same criteria.

Do not skip review solely because delegation is unavailable.

## 3. Return Findings

Return findings in descending severity using:

- **Critical**
- **Important**
- **Minor**

Each finding should identify:

- location;
- problem;
- impact;
- recommendation when the fix is not obvious.

If there are no substantive findings, say so clearly.

Finish with one assessment:

- **Ready**
- **Ready with minor improvements**
- **Needs changes**

Limit the assessment to the reviewed scope.

## 4. Return Control

Do not automatically modify the implementation.

The caller or user owns what happens next.

When findings are handled during plan execution, `executing-plans` should verify each finding against the code and requirements, implement valid fixes, and rerun affected verification.

## Remember

- Keep review scope explicit.
- Prefer an independent reviewer context when available.
- Do not require a specific subagent mechanism.
- Do not require committed changes.
- Review against requirements and actual code.
- Prioritize substantive defects over style.
- Reviewing and fixing are separate responsibilities.