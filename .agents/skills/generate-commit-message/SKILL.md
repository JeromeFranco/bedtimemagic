---
name: generate-commit-message
description: Generate clear Conventional Commit messages from git changes or a user-provided change description, emphasizing intent and impact rather than merely restating the diff. Use when asked to write, improve, or suggest a commit message, summarize changes for a commit, or determine how changes should be committed.
---

# Generate Commit Message

Generate commit messages that explain the purpose of a change while accurately reflecting the underlying diff.

## Workflow

1. Inspect the available change context.
   - Prefer staged changes when available.
   - Otherwise use the provided diff, changed files, or change description.
   - Infer intent from the evidence; do not invent motivations, issue numbers, or impact that cannot be established.

2. Determine whether the changes form one logical commit.
   - Keep tightly related changes together.
   - If the changes represent independent concerns, recommend separate commits and provide a message for each.

3. Choose the most appropriate Conventional Commit type:
   - `feat` — new capability
   - `fix` — corrected behavior
   - `refactor` — restructuring without intended behavior change
   - `perf` — performance improvement
   - `docs` — documentation
   - `test` — tests
   - `style` — non-functional formatting/style changes
   - `build` — build system or dependencies
   - `ci` — CI configuration
   - `chore` — maintenance not covered above
   - `revert` — revert of an earlier change

   Use a scope only when it adds useful context.

4. Write the message:

   ```text
   <type>(<optional scope>): <concise imperative summary>

   <optional body explaining motivation, context, or important consequences>

   <optional footer>
   ```

## Guidelines

- Describe the change accurately; prioritize **why it matters** over narrating individual diff lines.
- Use an imperative, concise subject.
- Add a body only when it provides useful context that is not obvious from the subject or diff.
- Preserve relevant issue references supplied by the user or repository context.
- Use `BREAKING CHANGE:` or the appropriate Conventional Commits breaking-change notation when the change is genuinely breaking.
- Do not fabricate rationale, tickets, compatibility impact, or breaking changes.
- If repository conventions are available, follow them over generic preferences.
- If the user asks for a short message, return only the concise commit subject.

## Output

Return the proposed commit message in a code block.

When multiple logical commits are appropriate, briefly explain the split and provide a separate commit message for each.