import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.e2e.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // One file, run in order: later tests build on earlier ones.
    fileParallelism: false,
  },
});
