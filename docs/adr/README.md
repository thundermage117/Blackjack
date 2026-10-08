# Architecture Decision Records

This folder records the significant technical decisions made on this project, why they were
made, and what they cost. The format follows
[Michael Nygard's ADR template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

| #                                                       | Title                                                 | Status   |
| ------------------------------------------------------- | ----------------------------------------------------- | -------- |
| [0001](0001-record-architecture-decisions.md)           | Record architecture decisions                         | Accepted |
| [0002](0002-frontend-only-mvp-with-pure-packages.md)    | Frontend-only MVP with pure, shared logic packages    | Accepted |
| [0003](0003-plain-css-instead-of-tailwind.md)           | Plain CSS with custom properties instead of Tailwind  | Accepted |
| [0004](0004-synthesized-sound-with-web-audio.md)        | Synthesize sound effects with the Web Audio API       | Accepted |
| [0005](0005-play-money-bankroll-in-local-storage.md)    | Play-money bankroll persisted in localStorage         | Accepted |
| [0006](0006-bet-agnostic-engine-with-settlement.md)     | Keep the round engine bet-agnostic                    | Accepted |
| [0007](0007-staged-dealer-reveal-in-ui-layer.md)        | Stage the dealer reveal in the UI, not the engine     | Accepted |

## Writing a new ADR

1. Copy [`template.md`](template.md) to `NNNN-short-title.md` using the next number.
2. Fill in Context, Decision and Consequences. Keep it to a page.
3. Add it to the table above and commit it alongside the change it describes.
4. Never rewrite an accepted ADR's decision. To change course, write a new ADR and mark the
   old one `Superseded by ADR-NNNN`.
