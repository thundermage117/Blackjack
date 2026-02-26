# Project Plan Document

**Project Title**: Blackjack  
**Author**: Abhinav Siddharth  
**Version**: 1.2  
**Date**: 2026-02-26

---

## Project Objective

Build a browser-based blackjack game with:

- a responsive UI
- a correct game engine
- a basic-strategy hint system
- optional backend persistence for player/game stats

The project goal is an MVP that is fun to play, technically correct, and easy to extend.

---

## MVP Scope (Must Have)

- Single-player blackjack in browser
- Deal / Hit / Stand / Double (if allowed by rules below)
- Accurate hand scoring (including soft totals and blackjack detection)
- Dealer turn and outcome resolution
- Hint button using a deterministic basic strategy table
- Mobile-friendly layout
- Local session stats (wins/losses/pushes) in frontend

### Post-MVP (Should Have)

- Backend API for persistent stats
- MongoDB storage
- Hosted deployment for frontend + backend

### Out of Scope for MVP (Not Now)

- Multiplayer
- Real-money gameplay
- Authentication
- AI/ML-generated hints
- Splits, insurance, surrender (unless added after core game is stable)

---

## Rules Assumptions (Define Before Coding)

Hint correctness depends on exact rules. MVP will use these assumptions:

- 1 player vs dealer
- 6-deck shoe (standard casino-style; can be changed later)
- Dealer stands on soft 17
- Blackjack pays 3:2
- Double allowed on first two cards only
- No split / surrender / insurance in MVP
- Reshuffle when deck is low (or reshuffle every round for simpler MVP)

If any of these change, the hint engine and tests must be updated together.

---

## Tech Stack

- **Frontend**: React + TailwindCSS
- **Game Logic + Hint Engine**: Shared TypeScript modules (frontend-first)
- **Backend (Post-MVP)**: Node.js + Express
- **Database (Post-MVP)**: MongoDB + Mongoose
- **Hosting**: Vercel (frontend), Render/Railway (backend)
- **Version Control**: Git + GitHub

### Architecture Note

For MVP, keep game state and rules in the frontend and treat the backend as stats-only (or skip backend entirely at first). This avoids duplicating game logic across client/server.

---

## Core Modules

| Module | Description | MVP? |
|---|---|---|
| Game UI | Table layout, card rendering, controls, status messages | Yes |
| Game Engine | Deck, dealing, turn flow, scoring, outcomes | Yes |
| Hint Engine | Basic-strategy lookup based on player total + dealer upcard | Yes |
| State Management | Round state, actions, session stats | Yes |
| API Server | Endpoints for stats persistence | Post-MVP |
| Database Models | Player/game stats schemas | Post-MVP |
| Stats Dashboard | Persistent history and analytics | Post-MVP |

---

## Success Criteria (MVP Exit Criteria)

The MVP is complete when all of the following are true:

- A full blackjack round can be played without rule-breaking states
- Hand totals and outcomes are correct for tested scenarios
- Hint button returns expected moves for a defined ruleset
- UI works on desktop and mobile widths
- Basic session stats update correctly
- App is deployable and playable from a public URL (frontend only is acceptable for MVP)

---

## Development Plan (MVP-First)

| Phase | Task | Estimate |
|---|---|---|
| 1 | Finalize rules + write acceptance scenarios | 0.5-1 day |
| 2 | Project setup (React, Tailwind, linting, formatting) | 0.5 day |
| 3 | Implement game engine (cards, scoring, round flow) | 2-3 days |
| 4 | Unit tests for game engine edge cases | 1 day |
| 5 | Implement hint engine (basic strategy table lookup) | 1-1.5 days |
| 6 | Tests for hint engine against fixture scenarios | 0.5-1 day |
| 7 | Build UI (table, cards, controls, messages) | 1.5-2 days |
| 8 | Integrate UI + engine + hint + session stats | 1-1.5 days |
| 9 | Responsive polish + bug fixes | 1 day |
| 10 | Deploy frontend MVP + documentation | 0.5-1 day |

**MVP Total**: ~10-14 part-time days

### Post-MVP Backend Track

| Phase | Task | Estimate |
|---|---|---|
| 11 | Express API for stats endpoints | 1 day |
| 12 | Mongo models + persistence + validation | 1 day |
| 13 | Frontend API integration + error handling | 1 day |
| 14 | Backend deploy + integration testing | 0.5-1 day |

**Post-MVP Backend Add-on**: ~3.5-4 days

---

## Milestones

1. **Rules Locked + Test Scenarios Written**
2. **Game Engine Passes Core Tests**
3. **Hint Engine Matches Strategy Fixtures**
4. **Playable Frontend MVP (Local)**
5. **Deployed MVP**
6. **Post-MVP Persistent Stats (Optional)**

---

## Testing Strategy

Testing is a core deliverable, not a final cleanup step.

### Unit Tests (High Priority)

- Card value and ace handling
- Blackjack detection
- Bust logic
- Dealer draw behavior (including soft totals)
- Outcome resolution (win/loss/push/blackjack payout)
- Action guards (e.g., cannot hit after stand)

### Hint Engine Tests (High Priority)

- Predefined fixtures covering:
  - hard totals
  - soft totals
  - pairs (if pairs are later supported)
  - dealer upcards A through 10
- Rule-set-specific expectations (e.g., dealer stands on soft 17)

### UI / Integration Checks (Medium Priority)

- Core round flow smoke test
- Button enable/disable states
- Mobile layout sanity check at common widths

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Rule ambiguity causes incorrect hints | High | Lock rules before coding hint table; test fixtures tied to rules |
| Game engine bugs create invalid states | High | Unit tests before UI integration; keep engine pure and isolated |
| Backend slows MVP progress | Medium | Make backend optional until frontend MVP is complete |
| Time overrun from feature creep | High | Strict MVP scope; defer splits/auth/multiplayer |
| Deployment issues on free tiers | Low-Med | Deploy frontend first; keep backend stateless/simple |

---

## Tools and Workflow

- VS Code + ESLint + Prettier
- GitHub Issues or Projects (track by milestone)
- Optional: Postman/Insomnia for API testing
- Optional: PlantUML or Mermaid for flow diagrams

### Recommended Repo Hygiene

- `main` branch protected (if using GitHub)
- Small feature branches
- PR checklist (tests pass, no rule regressions, mobile check)

---

## Future Enhancements

- Split / surrender / insurance support
- Multiple deck rules + configurable table rules
- Persistent user profiles and authentication
- Visual hand history and analytics dashboard
- Multiplayer via WebSockets
- Native mobile app

---

## Summary

This is a strong solo project if executed as an MVP-first build. The key to success is to treat the game engine and hint engine as correctness-focused modules, lock the rules early, and defer backend persistence until the local playable version is stable.
