# ⚙️ Technical Specifications Document

**Project Title**: Blackjack
**Author**: Abhinav Siddharth  
**Version**: 1.0  
**Date**: 2025-06-17

> **Note (2026-10-08):** This is the original planning document. For what was actually built, see [docs/architecture.md](docs/architecture.md) and the [ADRs](docs/adr/README.md).

---

## 1. 🧱 System Architecture Overview

```
[Browser] → [React Frontend] → [REST API (Express)] → [MongoDB Atlas]
```

- **Frontend**: SPA built with React and TailwindCSS
- **Backend**: Node.js server using Express
- **Database**: MongoDB via Mongoose ODM
- **Hint Engine**: Modularized logic in backend with optional local fallback on frontend

---

## 2. 🌐 API Specification

### POST `/api/hint`
**Description**: Returns best move for given player hand  
**Input**:
```json
{
  "playerHand": ["8♠", "3♥"],
  "dealerCard": "10♣"
}
```
**Output**:
```json
{
  "action": "Hit"
}
```

### POST `/api/game`
**Description**: Store game outcome  
**Input**:
```json
{
  "playerId": "anon",
  "playerHand": ["10♠", "9♦"],
  "dealerHand": ["6♥", "10♣"],
  "result": "win"
}
```
**Output**: `201 Created`

### GET `/api/stats/:playerId`
**Description**: Fetch aggregate stats for a player  
**Output**:
```json
{
  "gamesPlayed": 12,
  "gamesWon": 8
}
```

---

## 3. 🧠 Hint Engine Specification

### Inputs
- Player Hand (Array of card strings)
- Dealer Face-up Card (String)

### Rules (simplified)
- Hard totals < 12: Always hit  
- Hard totals 12–16: Hit if dealer has 7–A  
- 17 or above: Stand  
- Soft hands follow adjusted rules  
- Doubling not supported in v1

---

## 4. 🗃️ Data Models

### `Game` Document
```json
{
  "_id": "ObjectId",
  "playerId": "anon",
  "playerHand": ["10♠", "6♥"],
  "dealerHand": ["9♦", "10♣"],
  "result": "lose",
  "createdAt": "ISODate"
}
```

### `Stats` (aggregated per player)
```json
{
  "playerId": "anon",
  "gamesPlayed": 25,
  "gamesWon": 12
}
```

---

## 5. 🧩 Component Breakdown

| Component | Responsibility |
|----------|----------------|
| GameBoard | Renders player/dealer hands, handles actions |
| Controls | Hit, Stand, Hint buttons |
| HintBox | Displays suggestions |
| Backend Routes | Hint, Save Game, Fetch Stats |
| HintService | Backend logic for move recommendation |
| Mongo Models | `Game`, `Stats` schemas using Mongoose |

---

## 6. 🧪 Testing Plan

| Component | Tests |
|----------|-------|
| Game Logic | Unit tests for blackjack outcomes |
| Hint Engine | Unit tests with pre-known hands |
| API Routes | Integration tests via Postman or Supertest |
| UI | Manual playtesting in desktop & mobile views |

---

## 7. 🛠️ Dev Environment

- Node.js LTS (18+)
- React 18+
- MongoDB Atlas (Free tier)
- Vercel (Frontend), Render/Railway (Backend)
- GitHub (Version Control)

---

## 8. 🏁 Build & Deployment

- **Frontend**: Deployed via Vercel from GitHub  
- **Backend**: Render free tier (auto deploy from repo)  
- **MongoDB**: Hosted on MongoDB Atlas

---

## 9. 🎯 Key Metrics

- Time to first interaction < 1s
- API latency < 500ms
- Hint accuracy: 100% against defined strategy
- Uptime goal: 99%

---

## 10. 🚀 Roadmap Beyond v1

- Multiplayer via WebSockets
- Authentication + JWT
- Game replay + visual history
- Dynamic hint tuning via AI

