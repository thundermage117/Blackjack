# 0003. Plain CSS with custom properties instead of Tailwind

- Status: Accepted
- Date: 2026-10-08

## Context

The project plan lists TailwindCSS for the frontend. The UI that was actually built is a
single themed table: felt gradients, playing cards, chips, and keyframe animations for
dealing and flipping cards. These rely heavily on bespoke gradients and keyframes.

## Decision

Use one plain stylesheet (`apps/web/src/styles.css`) with CSS custom properties for the
palette and BEM-like class names (`hand-panel`, `playing-card.is-hidden`). Do not add Tailwind
for the MVP.

## Consequences

- No extra build tooling or PostCSS configuration.
- Card and chip visuals stay readable in one place instead of long utility class strings.
- Motion is disabled globally by the existing `prefers-reduced-motion` media query.
- If the UI grows to many screens (e.g. a stats dashboard), revisit this. Tailwind or CSS
  modules would scale better than one global stylesheet.
