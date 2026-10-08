import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// The app is fully client-side, so the service worker precaches the whole build and the
// game runs offline. Updates wait for the player to reload (see ADR-0014).
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "prompt",
      // Registered from UpdatePrompt via `virtual:pwa-register/react`.
      injectRegister: false,
      // Icons and the favicon are already matched by `globPatterns`.
      includeManifestIcons: false,
      manifest: {
        id: "/",
        name: "Blackjack Trainer",
        short_name: "Blackjack",
        description: "Learn blackjack basic strategy and card counting, step by step.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0d1512",
        theme_color: "#0f5a39",
        categories: ["games", "education"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
