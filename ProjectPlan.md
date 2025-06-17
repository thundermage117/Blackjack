# 📅 Project Plan Document

**Project Title**: Blackjack
**Author**: Abhinav Siddharth  
**Version**: 1.0  
**Date**: 2025-06-17

---

## 🎯 Project Objective

Create a browser-based blackjack game with a backend and an intelligent hint system. The game should be engaging, responsive, and capable of storing player stats for future retrieval.

---

## 🧱 Tech Stack

- **Frontend**: React + TailwindCSS
- **Backend**: Node.js (Express)
- **Database**: MongoDB (using Mongoose)
- **Hosting**: Vercel (Frontend), Render or Railway (Backend)
- **Version Control**: Git + GitHub

---

## 📦 Key Modules

| Module           | Description |
|------------------|-------------|
| Game UI          | Blackjack interface, controls, card rendering |
| Game Engine      | Deck, rules, score calculation |
| Hint Engine      | Strategy-based move suggestion |
| API Server       | REST APIs to handle hints, game state, and stats |
| Database Models  | Player and Game schemas |
| Stats Display    | Optional stats panel for win/loss tracking |

---

## 🔁 Development Phases

| Phase | Task | Time Estimate |
|-------|------|---------------|
| Phase 1 | Requirements & Design Docs | 1 day |
| Phase 2 | Initial Setup (Repo, Monorepo, Linting, Tailwind) | 0.5 day |
| Phase 3 | Frontend UI Layout | 1 day |
| Phase 4 | Blackjack Game Logic | 1.5 days |
| Phase 5 | Hint Engine (Basic Strategy) | 1 day |
| Phase 6 | Backend API Setup (Express + Mongo) | 1 day |
| Phase 7 | API Integration | 1 day |
| Phase 8 | Game State Management + UX Polish | 1 day |
| Phase 9 | Deploy Frontend & Backend | 0.5 day |
| Phase 10 | Bug Fixes + Docs + Stretch Goals | 2 days |

**Total Duration**: ~10 Days (Part-time work)

---

## 📈 Milestones

1. ✅ UI & Game Engine Ready  
2. ✅ Basic Game Loop Working  
3. ✅ Hint Engine returns correct suggestions  
4. ✅ REST API hooked up  
5. ✅ Deploy MVP  
6. 🎯 Post-launch Polish + Docs

---

## 🔧 Tools & Resources

- VS Code with Prettier/ESLint
- PlantUML for diagrams
- GitHub Issues or Projects for tracking
- Optional: Postman for API testing

---

## 📊 Risk Assessment

| Risk | Mitigation |
|------|------------|
| Hint engine bugs | Test with predefined hands |
| Responsive UI issues | Test across breakpoints early |
| Hosting downtime | Use known free tiers (Vercel/Render) |
| Time overrun | Keep scope strict for MVP |

---

## 🛣️ Future Enhancements

- Android
- Authentication & user-specific stats
- Multiplayer support with WebSockets
- Visual history and analytics
- AI-based hint learning

---

## 🧠 Summary

This project is designed for 1 developer working solo with manageable scope and solid tech stack choices. It builds foundational skills in frontend, backend, API design, and game logic, and sets the stage for advanced features like AI hints and multiplayer.
