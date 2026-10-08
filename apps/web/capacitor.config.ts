import type { CapacitorConfig } from "@capacitor/cli";

// The Android app ships the same production build as the website (see ADR-0015).
const config: CapacitorConfig = {
  appId: "com.abhinav.blackjacktrainer",
  appName: "Blackjack Trainer",
  webDir: "dist",
  backgroundColor: "#0d1512",
  plugins: {
    // Light status bar icons on the dark table.
    SystemBars: { style: "DARK" },
  },
};

export default config;
