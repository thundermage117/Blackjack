# 0001. Record architecture decisions

- Status: Accepted
- Date: 2026-10-08

## Context

The project started from planning documents (`ProjectPlan.md`, `Requirements.md`,
`Specifications.md`) that describe an intended full-stack architecture. Several decisions made
while building the MVP intentionally differ from those plans (no backend yet, no Tailwind).
Without a record, a future contributor reading the specs would not know which parts are
outdated and why.

## Decision

We record significant decisions as Architecture Decision Records in `docs/adr/`, numbered
sequentially, one decision per file. The planning documents remain as historical intent;
ADRs and `docs/architecture.md` describe what was actually built.

## Consequences

- Each non-obvious technical choice gets a short, reviewable write-up committed with the code.
- Accepted ADRs are immutable; reversing a decision means writing a new ADR that supersedes it.
