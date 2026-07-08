# Architecture Decision Records (ADRs)

This directory contains architectural decisions for the project.

## What is an ADR?

An ADR documents an important architectural decision:
- **Context:** Why was the decision necessary?
- **Decision:** What was decided?
- **Alternatives:** What was rejected – and why?
- **Consequences:** What changes as a result?

## When to create an ADR?

- When choosing technology (framework, database, messaging)
- When deciding on architectural patterns (Hexagonal vs. Layered)
- When making decisions with long-term consequences
- When the team has discussed and reached an agreement

**Not for:** Implementation details that belong in a PR description.

## Numbering

Format: `NNN-short-title.md` (e.g. `001-database-selection.md`)
Numbers are sequential and never reused.

## Status values

| Status | Meaning |
|--------|---------|
| `Proposed` | Under discussion, not yet decided |
| `Accepted` | Decided and active |
| `Deprecated` | No longer recommended, but still present |
| `Superseded by ADR-NNN` | Replaced by a newer decision |

---

## Template

Create a new ADR with `/architecture` or manually using this template:

```markdown
# ADR NNN: [Title]

## Status
Proposed

## Date
YYYY-MM-DD

## Context
[Why is this decision necessary? What problem is being solved?]

## Decision
[What was decided?]

## Alternatives

### Option A: [Name]
**Pros:** ...
**Cons:** ...

### Option B: [Name]
**Pros:** ...
**Cons:** ...

## Rationale
[Why Option X? Which criteria were decisive?]

## Consequences
**Positive:**
- ...

**Negative / Trade-offs:**
- ...
```
