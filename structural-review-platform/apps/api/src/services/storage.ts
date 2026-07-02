import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { env } from "../config/env";

/**
 * 安全删除磁盘上的上传文件：仅允许删除位于上传根目录内的文件，
 * 防止越权删除任意路径。删除失败不抛出（文件可能已不存在）。
 */
export async function deleteStoredFile(storagePath?: string | null): Promise<void> {
  if (!storagePath) return;
  const absolute = isAbsolute(storagePath) ? storagePath : resolve(process.cwd(), storagePath);
  const root = env.uploadDir;
  const rel = relative(root, absolute);
  // rel 以 .. 开头或为绝对路径，说明目标在上传根目录之外，拒绝删除。
  if (rel.startsWith("..") || isAbsolute(rel)) return;
  try {
    await rm(absolute, { force: true });
  } catch {
    // 忽略：文件不存在或已被删除。
  }
}

/** 校验存储路径是否在允许的上传根目录内且文件存在，返回可安全读取的绝对路径。 */
export function resolveReadableStoragePath(storagePath?: string | null): string | null {
  if (!storagePath) return null;
  const absolute = isAbsolute(storagePath) ? storagePath : resolve(process.cwd(), storagePath);
  const rel = relative(env.uploadDir, absolute);
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return existsSync(absolute) ? absolute : null;
}
