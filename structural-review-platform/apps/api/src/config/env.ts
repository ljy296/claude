import { resolve } from "node:path";

/**
 * 统一读取并校验环境变量，避免各处散落 process.env 访问。
 */
function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const uploadDirRaw = process.env.UPLOAD_DIR?.trim();

export const env = {
  port: readInt("PORT", 3001),
  host: process.env.HOST?.trim() || "127.0.0.1",

  jwtSecret: process.env.JWT_SECRET?.trim() || "dev-only-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || "12h",
  jwtSecretIsDefault: !process.env.JWT_SECRET?.trim(),

  seedAdmin: {
    username: process.env.SEED_ADMIN_USERNAME?.trim() || "admin",
    password: process.env.SEED_ADMIN_PASSWORD?.trim() || "admin12345",
    displayName: process.env.SEED_ADMIN_DISPLAY_NAME?.trim() || "系统管理员",
  },

  /** 上传根目录：优先 UPLOAD_DIR，否则相对进程目录的 storage/uploads。 */
  uploadDir: uploadDirRaw
    ? resolve(uploadDirRaw)
    : resolve(process.cwd(), "storage", "uploads"),

  maxUploadBytes: readInt("MAX_UPLOAD_BYTES", 200 * 1024 * 1024),
  maxUploadFiles: readInt("MAX_UPLOAD_FILES", 50),

  enableOcr: process.env.ENABLE_OCR === "1",
  llm: {
    provider: process.env.LLM_PROVIDER?.trim() || "",
    apiKey: process.env.LLM_API_KEY?.trim() || "",
    model: process.env.LLM_MODEL?.trim() || "",
    baseUrl: process.env.LLM_BASE_URL?.trim() || "",
  },
} as const;

export type AppEnv = typeof env;
