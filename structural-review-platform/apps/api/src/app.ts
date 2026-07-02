import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import multer from "multer";
import { materialRouter, projectRouter, recycleBinRouter } from "./routes/projects";
import { authRouter } from "./routes/auth";
import { platformStore } from "./services/platformStore";
import { requireAuth } from "./auth/middleware";
import { asyncHandler, singleValue } from "./routes/helpers";

const allowedOrigins = (process.env.CORS_ORIGIN?.trim()
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://127.0.0.1:5173", "http://localhost:5173"]);

export function createApp() {
  const app = express();

  app.use(cors({
    origin(origin, callback) {
      // 允许无 Origin（同源、curl、测试）或在白名单内的来源。
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`来源不被允许：${origin}`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "10mb" }));

  // 公开端点：健康检查与登录。
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "structural-review-platform-api" });
  });
  app.use("/api/auth", authRouter);

  // 其余所有 /api/* 端点统一要求鉴权。
  app.use("/api", requireAuth);

  app.use("/api/projects", projectRouter);
  app.use("/api/materials", materialRouter);
  app.use("/api/recycle-bin", recycleBinRouter);

  app.get("/api/audit-logs", asyncHandler(async (_req, res) => {
    res.json({ auditLogs: await platformStore.listAuditLogs() });
  }));

  /** 全局资料库问答（不限项目） */
  app.post("/api/ai-qa/global", asyncHandler(async (req, res) => {
    const qa = await platformStore.createAiQa({
      scope: "global",
      question: singleValue(req.body.question),
      actorId: req.auth?.sub,
    });
    res.status(201).json({ qa });
  }));

  app.get("/api/ai-qa/global", asyncHandler(async (_req, res) => {
    res.json({ qas: await platformStore.listAiQa(undefined, "global") });
  }));

  // 统一错误处理：区分上传错误、来源错误与其它错误。
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE"
        ? "文件超过大小限制"
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
          ? "文件数量超过限制"
          : `上传失败：${err.message}`;
      res.status(413).json({ message });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    // 领域校验类错误（“不存在/不能为空/不支持”等）归为 400，其余 500。
    const isClientError = /不存在|不能为空|已存在|无效|不支持|至少|不属于|不能|请|超过|不被允许/.test(message);
    if (!isClientError) console.error("[api-error]", err);
    res.status(isClientError ? 400 : 500).json({ message });
  };
  app.use(errorHandler);

  return app;
}
