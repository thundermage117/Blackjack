# 0014. Installable PWA with offline play

- Status: Accepted
- Date: 2026-10-08

## Context

The first step of the "Expand to mobile" roadmap is letting players install the trainer to
their home screen and play without a network. Everything already runs in the browser
([ADR-0002](0002-frontend-only-mvp-with-pure-packages.md)) and the session is saved in
localStorage ([ADR-0011](0011-persist-hand-in-progress.md)), so the only missing pieces are
a web app manifest, icons and a service worker that serves the build offline.

Forces:

- The precache must list the hashed files of each build, and old caches must be cleaned up.
  Hand-maintaining that is error-prone.
- A new version must never take over in the middle of a hand without the player asking.
- The later native wrappers (Capacitor) should be able to reuse the same static build.

## Decision

- Use **`vite-plugin-pwa`** in `generateSW` mode (Workbox) from `apps/web/vite.config.ts`.
  It emits `manifest.webmanifest` and `sw.js` and fills the precache from the build output.
  A hand-written worker plus a small Vite plugin was considered: fewer dependencies, but we
  would own manifest generation, revisioning and cache cleanup ourselves.
- **Precache the whole build** (JS, CSS, HTML, icons, `woff2` fonts) and route every
  navigation to `index.html`, so `?seed=` links also work offline. There is no runtime
  caching because the app makes no network requests.
- **Updates wait for the player** (`registerType: "prompt"`). When a new worker is waiting,
  `UpdatePrompt` shows "A new version of the trainer is ready" with Reload and Later.
  Reload is safe mid-hand because the hand and dealer reveal are saved.
- The worker **claims clients on first install**, and Reload reloads on `controllerchange`.
  The plugin alone only reloads tabs that had a worker when they opened, so a first-visit
  tab's Reload button would otherwise do nothing. Claiming only happens when a worker
  activates, and an update activates only after Reload, so updates still wait.
- **Icons** (192/512, maskable 512, Apple touch 180, SVG favicon) are rendered from one SVG
  artwork by `apps/web/scripts/generate-icons.mjs` using Playwright's Chromium, which is
  already a dev dependency. The PNGs are committed, so builds do not need a browser.
- The manifest uses `display: "standalone"` and does not lock orientation; landscape layout
  is a separate roadmap item. No custom "Install" button: browsers offer their own install
  UI, and iOS uses Share → Add to Home Screen.
- The worker is only registered in production builds. `npm run dev` does not register it.

## Consequences

- The trainer installs on Android, desktop Chrome/Edge and iOS, and a hand plays fully
  offline after one visit. An e2e test goes offline, reloads and plays a hand; the console
  error fixture fails it if any asset is missing from the precache.
- First visit downloads the precache (about 840 KiB, including Inter and Playfair font
  subsets for Cyrillic, Greek and Vietnamese the English UI does not use). Trimming font
  subsets is a possible later optimisation.
- About 300 dev-only packages (Workbox build tooling) are added to the lockfile. None ship
  to the browser except `workbox-window` (about 2 KiB gzipped).
- Testing service-worker behaviour needs the production build (`npm run build` then
  `npm run preview`, or the e2e suite).
- Players on an old version keep it until they press Reload or close every tab of the app.
- The Capacitor wrappers can ship the same `apps/web/dist`. The service worker is
  redundant inside a native shell and may need disabling there.
