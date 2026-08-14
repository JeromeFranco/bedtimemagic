---
name: brainstorming
description: Explore requirements and design a change before implementation.
---

# Brainstorming

Turn a user's idea into an approved design before implementation.

Do not write implementation code or invoke implementation workflows until the
design has been presented and approved. Scale the design to the size of the
change; small changes may need only a few sentences.

## Workflow

1. Inspect relevant project context first: existing code, docs, conventions,
   and recent changes when useful.

2. Assess scope. If the request contains multiple largely independent
   subsystems, help decompose it before refining implementation details.

3. Clarify material unknowns one question at a time. Don't ask questions whose
   answers can be learned from the project.

4. Explore the solution.
   - If meaningful alternatives exist, present 2–3 approaches with trade-offs.
   - Recommend the simplest viable approach.
   - Don't invent alternatives or speculative features just to fill out the
     process. Apply YAGNI.

5. Present the proposed design at a level appropriate to its complexity.
   Cover only implementation-relevant aspects such as structure, interfaces,
   data flow, edge cases, and testing.
   - For large designs, validate major sections incrementally when useful.
   - Otherwise present the design together and ask for approval once.

6. Revise until the user approves the design.

## After Approval

Do not begin implementation directly.

If the change is small and well-bounded, offer the user two options:
- write the approved design as a spec, or
- go straight to an implementation plan.

For larger, cross-cutting, or architecturally significant work, recommend
writing the spec first.

If writing a spec:
- save it to `docs/specs/YYYY-MM-DD-<topic>-design.md` unless the
  project or user specifies another location;
- resolve obvious placeholders, contradictions, material ambiguities, and
  scope problems before handing it to the user;
- after approval, transition to implementation planning.

If skipping the spec:
- transition directly to implementation planning using the approved design as
  the source of truth.