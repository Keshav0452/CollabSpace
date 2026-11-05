import { defineConfig } from "vitest/config";

// `npm test`: fast unit tests only. End-to-end tests live in tests/e2e
// and run with `npm run test:e2e` (they need PostgreSQL and Redis).
export default defineConfig({
  test: {
    include: ["tests/*.test.ts"],
  },
});
