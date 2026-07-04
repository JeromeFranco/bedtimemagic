---
description: "Dispatch a spec compliance review subagent. Pass spec sections + git range as $ARGUMENTS. Returns structured per-claim verdict."
---

Dispatch a spec compliance review subagent. The reviewer judges INDEPENDENTLY against the spec — no implementer report is included (it anchors the reviewer toward confirming what was reported).

## Usage

```
/spec-review <spec sections> <git base> <git head>
```

Example:
```
/spec-review "$(cat docs/compose/specs/my-spec.md | grep -A5 '## S2')" abc1234 def5678
```

## Reviewer Prompt Template

Use this prompt when dispatching the reviewer subagent via the `actor` tool:

```
You are verifying whether an implementation matches its specification. Judge INDEPENDENTLY. You are given the spec sections the task must satisfy and the code diff — nothing else. There is deliberately no implementer report; do not ask for one.

## Spec sections this task covers

$ARGUMENTS (spec sections here)

## Git range to review

**Base:** <base commit>
**Head:** <head commit>

```bash
git diff <base>..<head>
```

## Your job

1. Read each covered spec section and enumerate the distinct, checkable CLAIMS inside it (a section usually contains several). A claim is one verifiable statement about required behavior.
2. For each claim, decide if it is in scope for THIS task. The task covers a subset of the section; claims other tasks own are out of scope here.
3. For each in-scope claim, verify it against the diff. Remember: the diff shows what changed, not what is missing. A required behavior with no corresponding code is a FAIL even though no diff line points to it — actively look for omissions.
4. Evidence is mandatory. A claim's status is backed by a test name, command execution output, or a `file:line` reference. A status asserted without such evidence is `fail`. Prose like "looks implemented" is NOT evidence.
5. If a claim describes runtime behavior you cannot judge from the diff alone, run the relevant test or command and cite the output. If you cannot verify it, mark it `unverifiable` — never a silent pass.

## Output format (return EXACTLY this structure)

**Status**: pass | fail
(pass only if every in-scope claim is `pass` with evidence)

**Claims**:
- [Sn · "<short claim text>"] in-scope · status: pass
  evidence: <test name | command output | file:line>
- [Sn · "<short claim text>"] in-scope · status: fail
  evidence: <what's missing or wrong, with file:line if applicable>
- [Sn · "<short claim text>"] out-of-scope-for-this-task
- [Sn · "<short claim text>"] in-scope · status: unverifiable
  evidence: <why it can't be verified from available material>

**Extra work not traced to any covered claim**:
- <file:line — what was built that no covered claim required, or "(none)">
```

## Two-Phase Review Process

1. **Phase 1**: Dispatch with spec sections + git diff ONLY. No implementer report.
2. **Phase 2** (only if phase 1 flagged items): Re-dispatch with phase-1 verdict + implementer's report. May downgrade flagged items; cannot add new passes.

Gate: task complete only when all in-scope claims are `pass` with evidence.
