import express from "express";
import { userStore } from "../services/userStore";
import { signToken } from "../auth/jwt";
import { requireAuth, requireRole } from "../auth/middleware";
import { asyncHandler, singleValue } from "./helpers";

export const authRouter = express.Router();

/** 登录（公开）。 */
authRouter.post("/login", asyncHandler(async (req, res) => {
  const username = singleValue(req.body?.username).trim();
  const password = singleValue(req.body?.password);
  if (!username || !password) {
    res.status(400).json({ message: "请输入用户名和密码" });
    return;
  }
  const user = await userStore.authenticate(username, password);
  if (!user) {
    res.status(401).json({ message: "用户名或密码错误" });
    return;
  }
  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  res.json({ token, user });
}));

/** 当前登录用户。 */
authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await userStore.getById(req.auth!.sub);
  if (!user) {
    res.status(401).json({ message: "用户不存在或已停用" });
    return;
  }
  res.json({ user });
}));

/** 创建用户（仅管理员）。 */
authRouter.post("/users", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const user = await userStore.createUser({
    username: singleValue(req.body?.username),
    password: singleValue(req.body?.password),
    displayName: singleValue(req.body?.displayName) || undefined,
    role: req.body?.role === "admin" ? "admin" : "reviewer",
  });
  res.status(201).json({ user });
}));

/** 用户列表（仅管理员）。 */
authRouter.get("/users", requireAuth, requireRole("admin"), asyncHandler(async (_req, res) => {
  res.json({ users: await userStore.listUsers() });
}));
