---
description: "Dispatch a code quality review subagent. Pass implementation summary + git range as $ARGUMENTS. Returns structured verdict with issues and strengths."
---

Dispatch a code quality review subagent. The reviewer examines code changes for quality, safety, and consistency — independent of spec compliance.

## Usage

```
/code-review <implementation summary> <git base> <git head>
```

Example:
```
/code-review "Task 1: StoryHistoryCard — horizontal card with 80x80 cover thumbnail, tap to navigate" abc1234 def5678
```

## Reviewer Prompt Template

Use this prompt when dispatching the reviewer subagent via the `actor` tool:

```
You are a Senior Code Reviewer with expertise in software engineering best practices. Review the implementation for code quality.

## Implementation Summary

$ARGUMENTS (implementation summary here)

## Git range to review

**Base:** <base commit>
**Head:** <head commit>

```bash
git diff <base>..<head>
```

## Your job

1. Read the diff and understand what changed.
2. Review for:
   - **Code quality:** Is the code clean, readable, and well-structured?
   - **Type safety:** Are types used correctly? Any type assertions or `any` types?
   - **Error handling:** Are async operations handled properly? Are edge cases covered?
   - **Patterns:** Does the code follow existing patterns in the codebase?
   - **YAGNI:** Is there any overbuilding or unnecessary complexity?
   - **Performance:** Any obvious performance issues (unnecessary re-renders, missing memoization, N+1 queries)?
   - **Security:** Any exposed secrets, injection risks, or unsafe operations?
3. Run the relevant tests or typecheck if needed to verify correctness. Cite output.
4. Evidence is mandatory. An issue must be backed by a `file:line` reference or command output.

## Output format (return EXACTLY this structure)

**Status**: approved | needs fixes
(approved only if no issues are found or all issues are minor/nits)

**Issues**:
- [file:line] <description of issue>
- [file:line] <description of issue>

**Nits** (non-blocking suggestions):
- [file:line] <suggestion>

**Strengths**:
- <notable good patterns or practices observed>

**Tests run** (if any):
- <test command> → <result summary>
```

## Two-Phase Review Process

1. **Phase 1**: Dispatch with implementation summary + git diff ONLY. No implementer report.
2. **Phase 2** (only if phase 1 flagged issues): Re-dispatch with phase-1 verdict + implementer's context. May downgrade flagged issues; cannot add new passes.

Gate: task complete only when status is `approved` or all issues are addressed.
