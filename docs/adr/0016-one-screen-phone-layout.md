# 0016. One-screen phone layout with a coach strip

- Status: Accepted
- Date: 2026-10-09

## Context

On phones the table, move buttons and coach were stacked in one long page. During a hand
the player scrolled to reach Hit and Stand on short screens, and again to read the coach.
In landscape the felt filled the screen and nothing else was visible. For a trainer whose
value is the feedback on each decision, the feedback must be on screen with the cards and
the moves.

## Decision

Below 641px wide, or in landscape under 521px tall, the app switches to a compact layout
that fits the viewport exactly (`100dvh`) and never scrolls:

- A one-row header: bankroll, icon buttons, and the level progress as a thin bar.
- The felt takes the remaining height. It is a size container, and the card width is
  derived from its height (`--card-w: clamp(40px, (100cqh - 216px) / 2.8, 84px)`), so the
  cards shrink to fit instead of pushing content off screen. Split hands cap the width so
  they sit side by side, labelled `#1`, `#2`.
- A coach strip replaces the coach panel: one message at a time, most urgent first
  (count check, level-up, feedback, suggestion, hint, welcome, progress). The detail shows
  one line and expands on tap. The running count moves to a small pill on the felt.
- One row of moves, with chips and Deal on one row, so the move bar keeps one height.
- In landscape, the felt sits on the left and the strip and moves on the right.

`useMediaQuery(COMPACT_LAYOUT_QUERY)` picks which coach to render. The same query is in
`styles.css`, and the two must stay in step.

## Consequences

- Every decision, its feedback and the moves are visible together on any phone size,
  including 320×568 and landscape. e2e tests check this at three sizes.
- The strip shows only one message. Lower-priority content (e.g. level progress during
  feedback) waits its turn; the full panel is still in Stats and on larger screens.
- Two coach renderings (`CoachPanel`, `CoachStrip`) must be kept in step when coach
  content changes.
- The `--card-h` custom property was removed: it was computed once at the root, so cards
  resized via `--card-w` kept the root height. Heights are now `calc(var(--card-w) * 1.4)`.
