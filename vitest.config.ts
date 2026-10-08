import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright specs live in e2e/ and run with `npm run test:e2e`.
    include: ["tests/**/*.test.ts"],
  },
});
