import express from "express";
import cors from "cors";
import { materialRouter, projectRouter, recycleBinRouter } from "./routes/projects";
import { platformStore } from "./services/platformStore";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "structural-review-platform-api" });
  });

  app.use("/api/projects", projectRouter);
  app.use("/api/materials", materialRouter);
  app.use("/api/recycle-bin", recycleBinRouter);

  app.get("/api/audit-logs", (_req, res) => {
    res.json({ auditLogs: platformStore.listAuditLogs() });
  });

  /** 全局资料库问答（不限项目） */
  app.post("/api/ai-qa/global", (req, res) => {
    try {
      const qa = platformStore.createAiQa({
        scope: "global",
        question: req.body.question ?? "",
      });
      res.status(201).json({ qa });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/ai-qa/global", (_req, res) => {
    res.json({ qas: platformStore.listAiQa(undefined, "global") });
  });

  return app;
}
