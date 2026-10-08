# 0010. Progressive learning levels

- Status: Accepted
- Date: 2026-10-08

## Context

The audience is people learning blackjack. Showing a beginner insurance, surrender, a
rules editor and a card count on day one is overwhelming. Experienced players, though,
should not be forced through a tutorial.

## Decision

Four levels, each defined as **configuration** in `apps/web/src/learning/levels.ts`:

| Level        | Actions                | Assists                                                                           |
| ------------ | ---------------------- | --------------------------------------------------------------------------------- |
| 1 Basics     | Hit, Stand             | Best move highlighted and explained; feedback on every decision                   |
| 2 Strategy   | + Double, Split        | Hints on request; feedback on mistakes; strategy chart                            |
| 3 Full table | + Insurance, Surrender | Table rules editor                                                                |
| 4 Counting   | same                   | Hi-Lo running/true count, count checks, hide totals, count-based insurance advice |

- `rulesForLevel(level, tableOptions)` switches locked actions off in the engine rules, so
  the engine itself enforces the level and hints never suggest a locked action. Levels 1-2
  always play the default table.
- A trainer grades every decision against basic strategy (or the count, for insurance at
  level 4), tracks accuracy and the most common mistakes, and explains each play in one
  sentence (`learning/explanations.ts`).
- **Promotion is suggested, never forced.** After a minimum number of decisions at a target
  accuracy (e.g. 25 at 90% for level 1), the coach offers the next level. "Not yet" snoozes
  the offer for 15 decisions. Any level can be chosen in Settings at any time.
- UI code asks the level definition (`level.actions.double`, `level.assists.autoHint`)
  instead of comparing level numbers.

## Consequences

- New features slot in by adding a flag to `LevelDefinition` and picking the level that
  turns it on.
- Locked actions are absent from the UI, not just disabled, which keeps level 1 uncluttered.
- Promotion thresholds are guesses and should be tuned once real players use the app.
