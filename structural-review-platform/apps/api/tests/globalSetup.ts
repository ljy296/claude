import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { rmSync } from "node:fs";

/** 测试前：重建一个独立的 SQLite 测试库并推送 schema。 */
export default function setup() {
  const apiDir = resolve(import.meta.dirname, "..");
  const testDb = resolve(apiDir, "prisma", "test.db");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try { rmSync(`${testDb}${suffix}`, { force: true }); } catch { /* ignore */ }
  }
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: `file:${testDb}` },
    stdio: "inherit",
  });
}
