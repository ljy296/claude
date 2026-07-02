import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../auth/passwords";
import { env } from "../config/env";

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "reviewer";
};

function toPublicUser(row: { id: string; username: string; displayName: string; role: string }): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role === "admin" ? "admin" : "reviewer",
  };
}

export const userStore = {
  async authenticate(username: string, password: string): Promise<PublicUser | null> {
    const row = await prisma.user.findUnique({ where: { username } });
    if (!row || row.disabledAt) return null;
    const ok = await verifyPassword(password, row.passwordHash);
    if (!ok) return null;
    return toPublicUser(row);
  },

  async getById(id: string): Promise<PublicUser | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row && !row.disabledAt ? toPublicUser(row) : null;
  },

  async createUser(input: { username: string; password: string; displayName?: string; role?: "admin" | "reviewer" }): Promise<PublicUser> {
    const username = input.username.trim();
    if (!username) throw new Error("用户名不能为空");
    if (input.password.length < 8) throw new Error("密码至少 8 位");
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) throw new Error("用户名已存在");
    const row = await prisma.user.create({
      data: {
        username,
        displayName: input.displayName?.trim() || username,
        passwordHash: await hashPassword(input.password),
        role: input.role === "admin" ? "admin" : "reviewer",
      },
    });
    return toPublicUser(row);
  },

  async listUsers(): Promise<PublicUser[]> {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toPublicUser);
  },

  /** 首次启动时创建默认管理员（若尚无任何用户）。返回是否创建。 */
  async ensureSeedAdmin(): Promise<{ created: boolean; username: string }> {
    const count = await prisma.user.count();
    if (count > 0) return { created: false, username: "" };
    await prisma.user.create({
      data: {
        username: env.seedAdmin.username,
        displayName: env.seedAdmin.displayName,
        passwordHash: await hashPassword(env.seedAdmin.password),
        role: "admin",
      },
    });
    return { created: true, username: env.seedAdmin.username };
  },
};
