# Hint Strategy Table Format (Data-Driven)

Version: 1.2
Last updated: 2026-10-08

## Goal

Represent blackjack basic strategy in a plain data table so the hint engine:

- stays deterministic
- is easy to review
- can be tested with fixtures
- can support multiple rulesets later

## Design

The hint engine reads a table keyed by hand category and total.

### Dealer Upcard Keys

Allowed keys:

- `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `A`

### Row Keys

Rows are keyed by one of:

- `hard:<total>` (example: `hard:16`)
- `soft:<total>` (example: `soft:18`)
- `pair:<rank>` (future use, example: `pair:8`)

MVP does not support splits, so `pair:*` rows are optional and can be omitted.

### Actions

Allowed action values:

- `H` = Hit
- `S` = Stand
- `D` = Double (double if allowed, otherwise fallback)

Optional future values:

- `P` = Split
- `R` = Surrender

## Type Shape (TypeScript)

```ts
type DealerUpcardKey = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "A";
type StrategyAction = "H" | "S" | "D";

type StrategyRow = Partial<Record<DealerUpcardKey, StrategyAction>>;

interface StrategyTable {
  hard: Record<string, StrategyRow>;
  soft: Record<string, StrategyRow>;
  pair?: Record<string, StrategyRow>;
  metadata: {
    name: string;
    dealerSoft17: "stand" | "hit";
    deckCount: number | "any";
    notes?: string;
  };
}
```

## Example (MVP Partial)

```json
{
  "metadata": {
    "name": "blackjack-mvp-s17",
    "dealerSoft17": "stand",
    "deckCount": 6
  },
  "hard": {
    "16": {
      "2": "S",
      "3": "S",
      "4": "S",
      "5": "S",
      "6": "S",
      "7": "H",
      "8": "H",
      "9": "H",
      "10": "H",
      "A": "H"
    },
    "17": {
      "2": "S",
      "3": "S",
      "4": "S",
      "5": "S",
      "6": "S",
      "7": "S",
      "8": "S",
      "9": "S",
      "10": "S",
      "A": "S"
    }
  },
  "soft": {
    "18": {
      "2": "S",
      "3": "D",
      "4": "D",
      "5": "D",
      "6": "D",
      "7": "S",
      "8": "S",
      "9": "H",
      "10": "H",
      "A": "H"
    }
  }
}
```

## Engine Resolution Order

Given a player hand and dealer upcard:

1. Compute hand classification (`hard`, `soft`, later `pair`)
2. Build row key using total/rank
3. Lookup row and dealer upcard key
4. If action is `D` but double is not allowed, apply fallback (usually `H` or `S`)
5. Return normalized UI action (`Hit`, `Stand`, `Double`)

## Validation Rules for Strategy Data

- Every row should include all dealer upcard keys (`2`-`10`, `A`)
- No unsupported action values
- Metadata must match current engine rules (`dealerSoft17`, deck count assumptions)
- Tests should fail if a requested row or upcard is missing

## Table Change Log

Any change to a table cell must update `tests/fixtures/hint-fixtures.json` in the same commit.

### 1.2 (2026-10-08): align `blackjack-mvp-s17` with 6-deck S17 basic strategy

| Cell           | Before | After | Reason                                                  |
| -------------- | ------ | ----- | ------------------------------------------------------- |
| `soft:13` v5-6 | H      | D     | Standard multi-deck play; `getHint` fallback assumed it |
| `soft:14` v5-6 | H      | D     | Same as above                                           |
| `soft:19` v6   | D      | S     | Doubling soft 19 vs 6 is the H17 play, not S17          |
| `hard:11` vA   | D      | H     | Doubling 11 vs A is the H17 play for 6 decks            |

`tests/hint-engine.table.test.ts` also checks that every row covers all dealer upcards and that
the table metadata matches `DEFAULT_MVP_RULES`.
