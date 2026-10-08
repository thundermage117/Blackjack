# 0015. Android app with Capacitor

- Status: Accepted
- Date: 2026-10-08

## Context

The "Expand to mobile" roadmap calls for native app builds. The first ask is a release APK
that can be installed on a phone directly, with the Play Store as a later step. The app is
a static, client-side build ([ADR-0002](0002-frontend-only-mvp-with-pure-packages.md)) and
is already an offline PWA ([ADR-0014](0014-installable-pwa-with-offline-play.md)).

Options considered:

- **Trusted Web Activity** (Bubblewrap): a thin shell around the hosted site. It needs a
  live HTTPS deployment with Digital Asset Links, and the site is not hosted yet.
- **Capacitor**: bundles the build into the APK and serves it from a local WebView. Works
  offline from first launch, needs no hosting, and gives access to native plugins (haptics,
  audio) for the follow-up roadmap items.

## Decision

- Use **Capacitor 8**. The native project lives in `apps/web/android/` and is committed;
  the copied web build and generated plugin files inside it are gitignored by Capacitor's
  own `.gitignore`. `apps/web/capacitor.config.ts` points `webDir` at `dist`.
- Application id **`com.abhinav.blackjacktrainer`**. It cannot change once the app is
  published to the Play Store.
- **No service worker in the native app.** `App` only renders `UpdatePrompt` when
  `Capacitor.isNativePlatform()` is false. The APK already contains every file and updates
  by installing a new APK; a cached worker could keep serving the previous version's files.
- **Edge to edge.** Capacitor 8 draws behind the system bars and reports their size through
  `--safe-area-inset-*` (or `env(safe-area-inset-*)` on newer WebViews). The app shell pads
  by those insets, with `viewport-fit=cover`. Status bar icons are light (`SystemBars`
  style `DARK`).
- **Signing.** The release keystore and its passwords live in `apps/web/android/keystore/`
  and `apps/web/android/keystore.properties`. Both are gitignored (`*.jks`, `*.keystore`,
  `keystore.properties`) and must be backed up outside the repo. Without the properties
  file, `assembleRelease` produces an unsigned APK, so a fresh clone still builds.
- Launcher icons (legacy, round and adaptive) and splash screens are generated from the
  same artwork as the web icons by `apps/web/scripts/generate-icons.mjs`.
- `npm run apk` builds the web app, syncs it into the Android project and runs
  `./gradlew assembleRelease`. The build is local for now; it needs JDK 21 and the Android
  SDK (`JAVA_HOME`, `ANDROID_HOME`).

## Consequences

- A signed APK can be sideloaded on Android 7.0+ (API 24), and the whole game works
  offline from first launch.
- Losing the keystore means existing installs cannot be updated by a new APK. If the app
  goes to the Play Store with Play App Signing, this key becomes the replaceable upload key.
- `versionCode` in `apps/web/android/app/build.gradle` must be increased for every release
  that should install over the previous one.
- `@capacitor/cli` needs Node 22+. It only runs locally; CI (Node 20) does not build the
  Android app yet. Building and signing the APK in CI is a possible next step.
- iOS is not set up. `npx cap add ios` would follow the same pattern but needs a Mac with
  Xcode and an Apple developer account to ship.
