import { mkdirSync, createReadStream, statSync } from "node:fs";
import { basename } from "node:path";
import express from "express";
import multer from "multer";
import { platformStore } from "../services/platformStore";
import { requireRole } from "../auth/middleware";
import { env } from "../config/env";
import { resolveReadableStoragePath } from "../services/storage";
import {
  asyncHandler,
  multiValue,
  optionalString,
  parseDeleteAction,
  parseMaterialType,
  sanitizeFileName,
  singleValue,
  toPublicMaterial,
  toPublicVersion,
} from "./helpers";

// 允许上传的工程相关文件扩展名白名单（阻止可执行/脚本类文件）。
const allowedExtensions = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "md", "rtf",
  "png", "jpg", "jpeg", "gif", "bmp", "webp", "tif", "tiff",
  "zip", "rar", "7z",
  "step", "stp", "igs", "iges", "dwg", "dxf", "prt", "sldprt", "sldasm", "asm", "x_t", "x_b", "ai", "stl",
  "json", "xml",
]);

function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9_]+)$/);
  return match ? match[1] : "";
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(env.uploadDir, { recursive: true });
      callback(null, env.uploadDir);
    },
    filename: (_req, file, callback) => {
      callback(null, `${Date.now()}_${sanitizeFileName(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: env.maxUploadBytes,
    files: env.maxUploadFiles,
  },
  fileFilter: (_req, file, callback) => {
    const ext = extensionOf(file.originalname);
    if (allowedExtensions.has(ext)) {
      callback(null, true);
    } else {
      callback(new Error(`不支持的文件类型：.${ext || "未知"}`));
    }
  },
});

export const projectRouter = express.Router();

projectRouter.get("/", asyncHandler(async (req, res) => {
  res.json({ projects: await platformStore.listProjects(req.query.includeDeleted === "true") });
}));

projectRouter.post("/", asyncHandler(async (req, res) => {
  const project = await platformStore.createProject({
    name: String(req.body.name ?? "").trim(),
    productCode: optionalString(req.body.productCode),
    description: optionalString(req.body.description),
  });
  res.status(201).json({ project, folders: await platformStore.listFolders(project.id) });
}));

projectRouter.get("/:projectId", asyncHandler(async (req, res) => {
  const project = await platformStore.getProject(req.params.projectId);
  if (!project) {
    res.status(404).json({ message: "项目不存在" });
    return;
  }
  res.json({ project, folders: await platformStore.listFolders(project.id) });
}));

projectRouter.patch("/:projectId", asyncHandler(async (req, res) => {
  res.json({
    project: await platformStore.updateProject(req.params.projectId, {
      name: optionalString(req.body.name),
      productCode: optionalString(req.body.productCode),
      description: optionalString(req.body.description),
    }),
  });
}));

projectRouter.delete("/:projectId", asyncHandler(async (req, res) => {
  res.json({ project: await platformStore.softDeleteProject(req.params.projectId) });
}));

projectRouter.post("/:projectId/restore", asyncHandler(async (req, res) => {
  res.json({ project: await platformStore.restoreProject(req.params.projectId) });
}));

projectRouter.get("/:projectId/folders", asyncHandler(async (req, res) => {
  res.json({ folders: await platformStore.listFolders(req.params.projectId) });
}));

projectRouter.get("/:projectId/folders/:folderCode", asyncHandler(async (req, res) => {
  const folder = await platformStore.getFolder(req.params.projectId, req.params.folderCode);
  if (!folder) {
    res.status(404).json({ message: "分类目录不存在" });
    return;
  }
  const [modules, materials, reports, missingHints, conflicts] = await Promise.all([
    platformStore.listModules(req.params.projectId, req.params.folderCode),
    platformStore.listMaterials(req.params.projectId, req.params.folderCode),
    platformStore.listReports(req.params.projectId, req.params.folderCode),
    platformStore.getMissingHints(req.params.projectId, req.params.folderCode),
    platformStore.checkCrossModuleConflicts(req.params.projectId, req.params.folderCode),
  ]);
  res.json({ folder, modules, materials: materials.map(toPublicMaterial), reports, missingHints, conflicts });
}));

projectRouter.post("/:projectId/folders/:folderCode/materials", upload.array("materials"), asyncHandler(async (req, res) => {
  const projectId = singleValue(req.params.projectId);
  const folderCode = singleValue(req.params.folderCode);
  const files = Array.isArray(req.files) ? req.files : [];
  const requestedType = parseMaterialType(singleValue(req.body.type));
  const relativePaths = multiValue(req.body.relativePaths);
  const moduleCodes = multiValue(req.body.moduleCodes);
  const actorId = req.auth?.sub;

  const materials = [];
  for (const [index, file] of files.entries()) {
    materials.push(await platformStore.addMaterial(projectId, {
      folderCode,
      moduleCodes,
      type: requestedType ?? (files.length > 1 ? "批量文件" : "单文件"),
      name: relativePaths[index] || file.originalname,
      storagePath: file.path,
      sizeBytes: file.size,
      mimeType: file.mimetype,
    }, actorId));
  }

  if (materials.length === 0 && req.body.name) {
    materials.push(await platformStore.addMaterial(projectId, {
      folderCode,
      moduleCodes,
      type: requestedType ?? "文件夹",
      name: singleValue(req.body.name),
    }, actorId));
  }

  res.status(201).json({ materials: materials.map(toPublicMaterial) });
}));

projectRouter.get("/:projectId/folders/:folderCode/materials", asyncHandler(async (req, res) => {
  const materials = await platformStore.listMaterials(req.params.projectId, req.params.folderCode, req.query.includeDeleted === "true");
  res.json({ materials: materials.map(toPublicMaterial) });
}));

projectRouter.get("/:projectId/folders/:folderCode/modules", asyncHandler(async (req, res) => {
  res.json({ modules: await platformStore.listModules(req.params.projectId, req.params.folderCode) });
}));

projectRouter.post("/:projectId/folders/:folderCode/modules/:moduleCode/interpret", asyncHandler(async (req, res) => {
  res.status(201).json(await platformStore.createModuleInterpretation(
    req.params.projectId,
    req.params.folderCode,
    req.params.moduleCode,
    String(req.body.reviewType ?? "模块深度解读"),
    req.auth?.sub,
  ));
}));

projectRouter.post("/:projectId/folders/:folderCode/modules/:moduleCode/confirm", asyncHandler(async (req, res) => {
  res.json({
    interpretation: await platformStore.confirmModuleInterpretation(req.params.projectId, req.params.folderCode, req.params.moduleCode, req.auth?.sub),
  });
}));

projectRouter.get("/:projectId/folders/:folderCode/modules/:moduleCode/interpretations", asyncHandler(async (req, res) => {
  res.json({
    interpretations: await platformStore.listModuleInterpretations(req.params.projectId, req.params.folderCode, req.params.moduleCode),
  });
}));

projectRouter.get("/:projectId/folders/:folderCode/reports", asyncHandler(async (req, res) => {
  res.json({ reports: await platformStore.listReports(req.params.projectId, req.params.folderCode) });
}));

projectRouter.get("/:projectId/folders/:folderCode/missing-hints", asyncHandler(async (req, res) => {
  res.json({ missingHints: await platformStore.getMissingHints(req.params.projectId, req.params.folderCode) });
}));

projectRouter.get("/:projectId/folders/:folderCode/conflicts", asyncHandler(async (req, res) => {
  res.json({ conflicts: await platformStore.checkCrossModuleConflicts(req.params.projectId, req.params.folderCode) });
}));

projectRouter.post("/:projectId/folders/:folderCode/reviews", asyncHandler(async (req, res) => {
  const review = await platformStore.createReview(req.params.projectId, req.params.folderCode, String(req.body.reviewType ?? "完整审查"), req.auth?.sub);
  res.status(201).json({ review, reports: await platformStore.listReports(req.params.projectId, req.params.folderCode) });
}));

projectRouter.get("/:projectId/materials/:materialId", asyncHandler(async (req, res) => {
  const detail = await platformStore.getMaterialDetail(singleValue(req.params.materialId), req.auth?.sub);
  res.json({
    ...detail,
    material: toPublicMaterial(detail.material),
    versions: detail.versions.map(toPublicVersion),
  });
}));

/** 安全下载资料文件（需鉴权），替代直接暴露服务器绝对路径。 */
projectRouter.get("/:projectId/materials/:materialId/download", asyncHandler(async (req, res) => {
  const target = await platformStore.getDownloadTarget(singleValue(req.params.materialId), optionalString(req.query.versionId));
  if (!target) {
    res.status(404).json({ message: "资料或版本不存在" });
    return;
  }
  const absolute = resolveReadableStoragePath(target.storagePath);
  if (!absolute) {
    res.status(404).json({ message: "文件不存在或无有效存储（可能是文件夹类占位对象）" });
    return;
  }
  const downloadName = basename(target.name) || "download";
  const asciiName = downloadName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encodedName = encodeURIComponent(downloadName);
  res.setHeader("Content-Type", target.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
  try {
    res.setHeader("Content-Length", statSync(absolute).size);
  } catch { /* 无法取大小时忽略 */ }
  const stream = createReadStream(absolute);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).json({ message: "文件读取失败" });
    else res.end();
  });
  stream.pipe(res);
}));

projectRouter.post("/:projectId/materials/:materialId/versions", upload.single("file"), asyncHandler(async (req, res) => {
  const file = req.file;
  const note = singleValue(req.body.note);
  const versionTag = optionalString(req.body.versionTag);
  const result = await platformStore.addMaterialVersion(singleValue(req.params.materialId), {
    name: file?.originalname ?? singleValue(req.body.name),
    storagePath: file?.path,
    sizeBytes: file?.size,
    mimeType: file?.mimetype,
    versionTag,
    note: note || "替换/新版本",
  }, req.auth?.sub);
  res.status(201).json({ material: toPublicMaterial(result.material), version: toPublicVersion(result.version) });
}));

projectRouter.patch("/:projectId/materials/:materialId/effective-version", asyncHandler(async (req, res) => {
  const result = await platformStore.setMaterialEffectiveVersion(singleValue(req.params.materialId), singleValue(req.body.versionId), req.auth?.sub);
  res.json({ material: toPublicMaterial(result.material), version: toPublicVersion(result.version) });
}));

projectRouter.patch("/:projectId/materials/:materialId/metadata", asyncHandler(async (req, res) => {
  const material = await platformStore.updateMaterialMetadata(singleValue(req.params.materialId), {
    metadata: optionalString(req.body.metadata),
    name: optionalString(req.body.name),
  }, req.auth?.sub);
  res.json({ material: toPublicMaterial(material) });
}));

projectRouter.delete("/:projectId/materials/:materialId/modules/:moduleCode", asyncHandler(async (req, res) => {
  const material = await platformStore.unlinkMaterialFromModule(singleValue(req.params.materialId), singleValue(req.params.moduleCode), req.auth?.sub);
  res.json({ material: toPublicMaterial(material) });
}));

projectRouter.post("/:projectId/folders/:folderCode/bom-check", asyncHandler(async (req, res) => {
  res.status(201).json(await platformStore.runBomDrawingCheck(req.params.projectId, req.params.folderCode, req.auth?.sub));
}));

projectRouter.get("/:projectId/folders/:folderCode/bom-check", asyncHandler(async (req, res) => {
  res.json({ results: await platformStore.listBomCheckResults(req.params.projectId, req.params.folderCode) });
}));

projectRouter.get("/:projectId/folders/:folderCode/relation-graph", asyncHandler(async (req, res) => {
  res.json(await platformStore.buildRelationGraph(req.params.projectId, req.params.folderCode));
}));

projectRouter.post("/:projectId/ai-qa", asyncHandler(async (req, res) => {
  const qa = await platformStore.createAiQa({
    scope: "project",
    projectId: req.params.projectId,
    question: singleValue(req.body.question),
    actorId: req.auth?.sub,
  });
  res.status(201).json({ qa });
}));

projectRouter.get("/:projectId/ai-qa", asyncHandler(async (req, res) => {
  res.json({ qas: await platformStore.listAiQa(req.params.projectId, "project") });
}));

projectRouter.get("/:projectId/audit-logs", asyncHandler(async (req, res) => {
  res.json({ logs: await platformStore.listAuditLogs(req.params.projectId) });
}));

export const materialRouter = express.Router();

materialRouter.patch("/:materialId/remove-from-review", asyncHandler(async (req, res) => {
  const result = await platformStore.deleteMaterial(req.params.materialId, "从本次审查移除", req.auth?.sub);
  res.json({ ...result, material: toPublicMaterial(result.material) });
}));

materialRouter.delete("/:materialId", asyncHandler(async (req, res) => {
  const action = parseDeleteAction(req.body?.action) ?? "从分类文件夹删除";
  if (action === "彻底删除") {
    res.status(400).json({ message: "彻底删除请使用 /permanent 端点（需管理员权限）" });
    return;
  }
  const result = await platformStore.deleteMaterial(req.params.materialId, action, req.auth?.sub);
  res.json({ ...result, material: toPublicMaterial(result.material) });
}));

materialRouter.post("/:materialId/restore", asyncHandler(async (req, res) => {
  res.json({ material: toPublicMaterial(await platformStore.restoreMaterial(req.params.materialId, req.auth?.sub)) });
}));

// 彻底删除：仅管理员可执行（会同时删除磁盘文件）。
materialRouter.delete("/:materialId/permanent", requireRole("admin"), asyncHandler(async (req, res) => {
  const result = await platformStore.deleteMaterial(req.params.materialId, "彻底删除", req.auth?.sub);
  res.json({ ...result, material: toPublicMaterial(result.material) });
}));

export const recycleBinRouter = express.Router();

recycleBinRouter.get("/", asyncHandler(async (_req, res) => {
  res.json({ materials: (await platformStore.listRecycleBin()).map(toPublicMaterial) });
}));
