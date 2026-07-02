import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const testDb = resolve(import.meta.dirname, "prisma", "test.db");
const databaseUrl = `file:${testDb}`;

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: databaseUrl,
      JWT_SECRET: "test-secret-key-for-vitest-only",
      NODE_ENV: "test",
    },
    globalSetup: ["./tests/globalSetup.ts"],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
