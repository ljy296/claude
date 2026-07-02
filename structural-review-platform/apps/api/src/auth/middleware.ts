import type { NextFunction, Request, Response } from "express";
import { verifyToken, type AuthTokenPayload } from "./jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.header("authorization");
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

/** 要求携带有效 JWT，否则 401。校验通过后 req.auth 可用。 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ message: "未登录或缺少令牌" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "登录已过期或令牌无效" });
    return;
  }
  req.auth = payload;
  next();
}

/** 要求指定角色，否则 403。需先经过 requireAuth。 */
export function requireRole(...roles: Array<AuthTokenPayload["role"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: "未登录" });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ message: "权限不足，需要更高权限角色" });
      return;
    }
    next();
  };
}
