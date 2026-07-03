import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 运行时显式加载 apps/api/.env。
 * Prisma Client 在应用进程中不会自动读取 .env（只有 Prisma CLI 会），
 * 因此入口需最先导入本模块，确保 DATABASE_URL 等变量在其它模块初始化前就位。
 * 已存在于 process.env 的变量不被覆盖（真实环境变量优先于 .env 文件）。
 */
const envPath = resolve(import.meta.dirname, "..", "..", ".env");
if (existsSync(envPath) && !process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // 忽略：.env 不可读时保持现有环境变量。
  }
}
