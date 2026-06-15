import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import multer from "multer";
import { platformStore } from "../services/platformStore";
import { materialDeleteActions, materialObjectTypes, type MaterialDeleteAction, type MaterialObjectType } from "../../../../packages/review-core/src/projectStructure";

const uploadRoot = resolve(process.cwd(), "../../storage/uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(uploadRoot, { recursive: true });
      callback(null, uploadRoot);
    },
    filename: (_req, file, callback) => {
      callback(null, `${Date.now()}_${sanitizeFileName(file.originalname)}`);
    },
  }),
});

export const projectRouter = express.Router();

projectRouter.get("/", (req, res) => {
  res.json({
    projects: platformStore.listProjects(req.query.includeDeleted === "true"),
  });
});

projectRouter.post("/", (req, res) => {
  try {
    const project = platformStore.createProject({
      name: String(req.body.name ?? "").trim(),
      productCode: optionalString(req.body.productCode),
      description: optionalString(req.body.description),
    });
    res.status(201).json({ project, folders: platformStore.listFolders(project.id) });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId", (req, res) => {
  try {
    const project = platformStore.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ message: "项目不存在" });
    return res.json({ project, folders: platformStore.listFolders(project.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

projectRouter.patch("/:projectId", (req, res) => {
  try {
    res.json({
      project: platformStore.updateProject(req.params.projectId, {
        name: optionalString(req.body.name),
        productCode: optionalString(req.body.productCode),
        description: optionalString(req.body.description),
      }),
    });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.delete("/:projectId", (req, res) => {
  try {
    res.json({ project: platformStore.softDeleteProject(req.params.projectId) });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.post("/:projectId/restore", (req, res) => {
  try {
    res.json({ project: platformStore.restoreProject(req.params.projectId) });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders", (req, res) => {
  try {
    res.json({ folders: platformStore.listFolders(req.params.projectId) });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders/:folderCode", (req, res) => {
  try {
    const folder = platformStore.getFolder(req.params.projectId, req.params.folderCode);
    if (!folder) return res.status(404).json({ message: "分类目录不存在" });
    return res.json({
      folder,
      modules: platformStore.listModules(req.params.projectId, req.params.folderCode),
      materials: platformStore.listMaterials(req.params.projectId, req.params.folderCode),
      reports: platformStore.listReports(req.params.projectId, req.params.folderCode),
      missingHints: platformStore.getMissingHints(req.params.projectId, req.params.folderCode),
      conflicts: platformStore.checkCrossModuleConflicts(req.params.projectId, req.params.folderCode),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

projectRouter.post("/:projectId/folders/:folderCode/materials", upload.array("materials"), (req, res) => {
  try {
    const projectId = singleValue(req.params.projectId);
    const folderCode = singleValue(req.params.folderCode);
    const files = Array.isArray(req.files) ? req.files : [];
    const requestedType = parseMaterialType(singleValue(req.body.type));
    const relativePaths = multiValue(req.body.relativePaths);
    const moduleCodes = multiValue(req.body.moduleCodes);
    const materials = files.map((file, index) => platformStore.addMaterial(projectId, {
      folderCode,
      moduleCodes,
      type: requestedType ?? (files.length > 1 ? "批量文件" : "单文件"),
      name: relativePaths[index] || file.originalname,
      storagePath: file.path,
      sizeBytes: file.size,
      mimeType: file.mimetype,
    }));

    if (materials.length === 0 && req.body.name) {
      materials.push(platformStore.addMaterial(projectId, {
        folderCode,
        moduleCodes,
        type: requestedType ?? "文件夹",
        name: singleValue(req.body.name),
      }));
    }

    res.status(201).json({ materials });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders/:folderCode/materials", (req, res) => {
  try {
    res.json({
      materials: platformStore.listMaterials(req.params.projectId, req.params.folderCode, req.query.includeDeleted === "true"),
    });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders/:folderCode/modules", (req, res) => {
  try {
    res.json({
      modules: platformStore.listModules(req.params.projectId, req.params.folderCode),
    });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.post("/:projectId/folders/:folderCode/modules/:moduleCode/interpret", (req, res) => {
  try {
    res.status(201).json(platformStore.createModuleInterpretation(
      req.params.projectId,
      req.params.folderCode,
      req.params.moduleCode,
      String(req.body.reviewType ?? "模块深度解读"),
    ));
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.post("/:projectId/folders/:folderCode/modules/:moduleCode/confirm", (req, res) => {
  try {
    res.json({
      interpretation: platformStore.confirmModuleInterpretation(req.params.projectId, req.params.folderCode, req.params.moduleCode),
    });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders/:folderCode/modules/:moduleCode/interpretations", (req, res) => {
  try {
    res.json({
      interpretations: platformStore.listModuleInterpretations(req.params.projectId, req.params.folderCode, req.params.moduleCode),
    });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders/:folderCode/reports", (req, res) => {
  try {
    res.json({
      reports: platformStore.listReports(req.params.projectId, req.params.folderCode),
    });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders/:folderCode/missing-hints", (req, res) => {
  try {
    res.json({
      missingHints: platformStore.getMissingHints(req.params.projectId, req.params.folderCode),
    });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders/:folderCode/conflicts", (req, res) => {
  try {
    res.json({
      conflicts: platformStore.checkCrossModuleConflicts(req.params.projectId, req.params.folderCode),
    });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.post("/:projectId/folders/:folderCode/reviews", (req, res) => {
  try {
    const review = platformStore.createReview(req.params.projectId, req.params.folderCode, String(req.body.reviewType ?? "完整审查"));
    res.status(201).json({
      review,
      reports: platformStore.listReports(req.params.projectId, req.params.folderCode),
    });
  } catch (error) {
    sendError(res, error);
  }
});

/** 获取资料对象详情页 */
projectRouter.get("/:projectId/materials/:materialId", (req, res) => {
  try {
    res.json(platformStore.getMaterialDetail(singleValue(req.params.materialId)));
  } catch (error) {
    sendError(res, error);
  }
});

/** 资料对象上传新版本（替换） */
projectRouter.post("/:projectId/materials/:materialId/versions", upload.single("file"), (req, res) => {
  try {
    const file = req.file;
    const note = singleValue(req.body.note);
    const versionTag = optionalString(req.body.versionTag);
    const result = platformStore.addMaterialVersion(singleValue(req.params.materialId), {
      name: file?.originalname ?? singleValue(req.body.name),
      storagePath: file?.path,
      sizeBytes: file?.size,
      mimeType: file?.mimetype,
      versionTag,
      note: note || "替换/新版本",
    });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
});

/** 设置资料对象有效版本 */
projectRouter.patch("/:projectId/materials/:materialId/effective-version", (req, res) => {
  try {
    res.json(platformStore.setMaterialEffectiveVersion(singleValue(req.params.materialId), singleValue(req.body.versionId)));
  } catch (error) {
    sendError(res, error);
  }
});

/** 修改资料对象元数据 */
projectRouter.patch("/:projectId/materials/:materialId/metadata", (req, res) => {
  try {
    res.json({
      material: platformStore.updateMaterialMetadata(singleValue(req.params.materialId), {
        metadata: optionalString(req.body.metadata),
        name: optionalString(req.body.name),
      }),
    });
  } catch (error) {
    sendError(res, error);
  }
});

/** 解绑资料对象与模块 */
projectRouter.delete("/:projectId/materials/:materialId/modules/:moduleCode", (req, res) => {
  try {
    res.json({ material: platformStore.unlinkMaterialFromModule(singleValue(req.params.materialId), singleValue(req.params.moduleCode)) });
  } catch (error) {
    sendError(res, error);
  }
});

/** BOM/图纸专项检查 */
projectRouter.post("/:projectId/folders/:folderCode/bom-check", (req, res) => {
  try {
    res.status(201).json(platformStore.runBomDrawingCheck(req.params.projectId, req.params.folderCode));
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/folders/:folderCode/bom-check", (req, res) => {
  try {
    res.json({ results: platformStore.listBomCheckResults(req.params.projectId, req.params.folderCode) });
  } catch (error) {
    sendError(res, error);
  }
});

/** 关联关系视图 */
projectRouter.get("/:projectId/folders/:folderCode/relation-graph", (req, res) => {
  try {
    res.json(platformStore.buildRelationGraph(req.params.projectId, req.params.folderCode));
  } catch (error) {
    sendError(res, error);
  }
});

/** AI 问答 */
projectRouter.post("/:projectId/ai-qa", (req, res) => {
  try {
    const qa = platformStore.createAiQa({
      scope: "project",
      projectId: req.params.projectId,
      question: singleValue(req.body.question),
    });
    res.status(201).json({ qa });
  } catch (error) {
    sendError(res, error);
  }
});

projectRouter.get("/:projectId/ai-qa", (req, res) => {
  try {
    res.json({ qas: platformStore.listAiQa(req.params.projectId, "project") });
  } catch (error) {
    sendError(res, error);
  }
});

/** 项目审计日志 */
projectRouter.get("/:projectId/audit-logs", (req, res) => {
  try {
    res.json({ logs: platformStore.listAuditLogs(req.params.projectId) });
  } catch (error) {
    sendError(res, error);
  }
});

export const materialRouter = express.Router();

materialRouter.patch("/:materialId/remove-from-review", (req, res) => {
  try {
    res.json(platformStore.deleteMaterial(req.params.materialId, "从本次审查移除"));
  } catch (error) {
    sendError(res, error);
  }
});

materialRouter.delete("/:materialId", (req, res) => {
  try {
    const action = parseDeleteAction(req.body.action) ?? "从分类文件夹删除";
    res.json(platformStore.deleteMaterial(req.params.materialId, action));
  } catch (error) {
    sendError(res, error);
  }
});

materialRouter.post("/:materialId/restore", (req, res) => {
  try {
    res.json({ material: platformStore.restoreMaterial(req.params.materialId) });
  } catch (error) {
    sendError(res, error);
  }
});

materialRouter.delete("/:materialId/permanent", (req, res) => {
  try {
    res.json(platformStore.deleteMaterial(req.params.materialId, "彻底删除"));
  } catch (error) {
    sendError(res, error);
  }
});

export const recycleBinRouter = express.Router();

recycleBinRouter.get("/", (_req, res) => {
  res.json({ materials: platformStore.listRecycleBin() });
});

function parseMaterialType(value: unknown): MaterialObjectType | undefined {
  return materialObjectTypes.includes(value as MaterialObjectType) ? value as MaterialObjectType : undefined;
}

function parseDeleteAction(value: unknown): MaterialDeleteAction | undefined {
  return materialDeleteActions.includes(value as MaterialDeleteAction) ? value as MaterialDeleteAction : undefined;
}

function optionalString(value: unknown): string | undefined {
  const text = singleValue(value).trim();
  return text || undefined;
}

function singleValue(value: unknown): string {
  if (Array.isArray(value)) return singleValue(value[0]);
  return typeof value === "string" ? value : "";
}

function multiValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(singleValue);
  const single = singleValue(value);
  return single ? [single] : [];
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_");
}

function sendError(res: express.Response, error: unknown) {
  res.status(400).json({ message: error instanceof Error ? error.message : String(error) });
}
