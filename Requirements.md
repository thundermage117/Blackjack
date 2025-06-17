# Software Requirements Specification (SRS)

**Project Title**: Blackjack
**Author**: Abhinav Siddharth
**Version**: 1.0  
**Date**: 2025-06-17

---

## 1. 📘 Introduction

### 1.1 Purpose  
The goal of this project is to create a browser-based single-player blackjack game with a hint engine that recommends optimal moves. The game will be interactive, responsive, and include a backend for game storage, stats tracking, and potentially future multiplayer expansion.

### 1.2 Intended Audience  
- There isn't an actual free blackjack game available on Android or Apple.
- Individual players interested in learning or practicing Blackjack  
- Students or learners studying decision-making and game theory  
- Developers contributing to or extending the game

### 1.3 Scope  
- Frontend: Responsive web interface using React  
- Backend: REST API using Express.js  
- Database: MongoDB for storing game history and player stats  
- Hint Engine: Basic strategy-based decision engine  
- Features: Start game, hit, stand, get hint, view stats  

### 1.4 Definitions  
- **Blackjack**: Card game where player aims to beat the dealer with a score <= 21  
- **Hint Engine**: Algorithm that suggests "Hit", "Stand", or "Double" based on probability  
- **Soft Total**: A hand including an Ace counted as 11  
- **Bust**: A score above 21

---

## 2. ✅ Overall Description

### 2.1 Product Perspective  
This is a standalone full-stack web application. The game is single-player but expandable to multiplayer. All data is stored in a backend service.

### 2.2 User Characteristics  
- No registration required (for v1)  
- Familiarity with cards expected  
- Web-savvy, mobile and desktop users

### 2.3 Constraints  
- Must run on all modern browsers  
- Free deployment tier (Vercel/Render)  
- Backend must respond within 500ms

### 2.4 Assumptions and Dependencies  
- Internet connection for saving stats  
- Hint engine assumes standard Blackjack rules (no split, no insurance)  
- MongoDB Atlas is available for use

---

## 3. 📋 Functional Requirements

### 3.1 Game Mechanics  
- Player starts game, gets 2 cards  
- Dealer gets one face-up, one face-down card  
- Player can:
  - Hit: Draw card
  - Stand: End turn
  - Get Hint: Request recommended move
- Dealer auto-plays after player ends turn
- Winner is decided based on scores

### 3.2 Hint Engine  
- Uses simplified Blackjack Basic Strategy  
- Accepts player total, dealer face-up card, and soft/hard status  
- Returns: "Hit", "Stand", "Double"

### 3.3 Game History API  
- POST `/api/game`: Save game outcome  
- GET `/api/stats/:playerId`: Get wins/losses  

### 3.4 Hint API  
- POST `/api/hint`: `{ playerHand, dealerCard }` → `{ action: "Hit" }`

---

## 4. 📶 Non-Functional Requirements

| Type            | Requirement |
|-----------------|-------------|
| Performance     | Response time < 500ms |
| Usability       | Intuitive button-based UI |
| Reliability     | 99% uptime on free tier |
| Scalability     | Can support multiplayer later |
| Accessibility   | Keyboard navigation (optional) |
| Security        | Basic input validation, no auth for v1 |

---

## 5. 🎨 User Interface Requirements

### Desktop
- Dealer and Player hands shown in separate rows  
- Controls below player hand: Hit, Stand, Hint, Restart  
- Hint box: clearly displays advice  
- Stats area: simple win/loss counter (optional)

### Mobile
- Same layout stacked vertically  
- Buttons larger and touch-friendly

---

## 6. 🔗 API Interface Requirements

### `/api/hint`
**Method**: POST  
**Input**:
```json
{
  "playerHand": ["10♠", "6♥"],
  "dealerCard": "9♦"
}
```
**Output**:
```json
{
  "action": "Hit"
}
```

---

## 7. 📦 Data Requirements

### Game Document
```json
{
  "playerId": "anon",
  "playerHand": ["10♠", "6♥"],
  "dealerHand": ["9♦", "10♣"],
  "result": "lose",
  "createdAt": "2025-06-12T12:00:00Z"
}
```

### Player Stats
```json
{
  "playerId": "anon",
  "gamesPlayed": 25,
  "gamesWon": 12
}
```

---

## 8. 🧪 Future Enhancements

- Port to Android
- Add **login/authentication** with JWT  
- Implement **multiplayer support** with WebSocket  
- Use **AI or Reinforcement Learning** for advanced hinting  
- Save hand history and win rates per move
