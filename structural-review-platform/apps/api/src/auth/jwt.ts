import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type AuthTokenPayload = {
  sub: string;
  username: string;
  role: "admin" | "reviewer";
};

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string") return null;
    const { sub, username, role } = decoded as jwt.JwtPayload & Partial<AuthTokenPayload>;
    if (typeof sub !== "string" || typeof username !== "string" || (role !== "admin" && role !== "reviewer")) return null;
    return { sub, username, role };
  } catch {
    return null;
  }
}
