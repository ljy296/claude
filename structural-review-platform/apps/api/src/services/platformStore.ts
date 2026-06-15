import {
  buildDefaultProjectFolders,
  buildFolderReportBaseName,
  describeMaterialDeletion,
  describeProjectSoftDelete,
  type MaterialObjectInput,
} from "../domain/projectLifecycle";
import {
  buildModuleReportBaseName,
  getModulesByFolder,
  reviewModules,
  type FolderStatus,
  type MaterialDeleteAction,
  type MaterialObjectType,
  type ModuleStatus,
  type ReviewModuleConfig,
  type EvidenceTrace,
} from "../../../../packages/review-core/src/projectStructure";

export type ProjectRecord = {
  id: string;
  name: string;
  productCode?: string;
  description?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFolderRecord = {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string;
  status: FolderStatus;
  sortOrder: number;
  materialCount: number;
  reportCount: number;
};

export type MaterialObjectRecord = {
  id: string;
  projectId: string;
  folderCode: string;
  moduleCodes: string[];
  type: MaterialObjectType;
  name: string;
  originalName?: string;
  storagePath?: string;
  sizeBytes?: number;
  mimeType?: string;
  deletedAt?: string;
  permanentlyDeletedAt?: string;
  createdAt: string;
  /** 当前有效版本号（如 RevA / V1.0）。未知时为 undefined。*/
  effectiveVersion?: string;
  /** 关联的版本历史列表，存储所有历史版本 ID */
  versionIds: string[];
  /** 当前使用的版本 ID（指向 MaterialVersionRecord.id） */
  activeVersionId?: string;
  /** 资料描述/元数据备注 */
  metadata?: string;
};

/** 资料对象的一个历史版本记录 */
export type MaterialVersionRecord = {
  id: string;
  materialId: string;
  projectId: string;
  versionTag: string;
  name: string;
  storagePath?: string;
  sizeBytes?: number;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: string;
  note?: string;
};

/** BOM/图纸专项对应检查结果 */
export type BomDrawingCheckResult = {
  id: string;
  projectId: string;
  folderCode: string;
  /** 参与本次检查的前缀，如 HA1_DE / HA1_CB */
  checkedPrefix: string;
  /** BOM有记录但未上传图纸的条目 */
  bomOnlyItems: string[];
  /** 已上传图纸但BOM中未登记的条目 */
  drawingOnlyItems: string[];
  /** 名称相似但不完全一致的对 */
  fuzzyMatches: Array<{ drawing: string; bom: string; similarity: number }>;
  /** 版本号冲突条目 */
  versionConflicts: Array<{ name: string; drawingVersion: string; bomVersion: string }>;
  /** 2D/3D/BOM三者缺一的条目 */
  tripleGaps: string[];
  /** 疑似同一零件但命名不规范 */
  namingIssues: string[];
  /** 建议动作 */
  suggestions: string[];
  /** 匹配使用的BOM sheet名称 */
  usedSheet: string;
  /** 该sheet是否是自动识别（非精确匹配） */
  sheetIsAutoDetected: boolean;
  createdAt: string;
};

/** AI 问答记录 */
export type AiQaRecord = {
  id: string;
  scope: "project" | "global";
  projectId?: string;
  question: string;
  answer: string;
  /** 引用的证据来源 */
  evidenceSources: AiQaEvidenceSource[];
  /** 问答可信度：可判断 / 部分可判断 / 资料不足 */
  judgability: "可判断" | "部分可判断" | "资料不足";
  permissionScope: string;
  createdAt: string;
};

export type ReviewModuleRecord = ReviewModuleConfig & {
  status: ModuleStatus;
  materialCount: number;
  interpretationCount: number;
  reportCount: number;
};

export type ReviewJobRecord = {
  id: string;
  projectId: string;
  folderCode?: string;
  reviewType: string;
  status: "pending" | "running" | "succeeded" | "failed";
  reportBaseName: string;
  createdAt: string;
};

export type ReviewReportRecord = {
  id: string;
  projectId: string;
  folderCode?: string;
  moduleCode?: string;
  reviewJobId: string;
  baseName: string;
  title: string;
  markdownContent: string;
  createdAt: string;
};

export type ModuleInterpretationRecord = {
  id: string;
  projectId: string;
  folderCode: string;
  moduleCode: string;
  moduleName: string;
  status: ModuleStatus;
  materialStatus: string;
  recognizedMaterials: string[];
  coreSummary: string;
  sourceType: "明确陈述" | "上下文推断" | "视觉判断" | "未知";
  structuralJudgment: string;
  risks: string[];
  missingItems: string[];
  evidenceChain: EvidenceTrace[];
  admissionResult: {
    passed: boolean;
    missingConditions: string[];
    conclusion: string;
  };
  confirmationQuestions: string[];
  suggestedActions: string[];
  confidence: "高" | "中" | "低" | "未知";
  blocksStage: boolean;
  createdAt: string;
  confirmedAt?: string;
};

export type CrossModuleConflictRecord = {
  id: string;
  projectId: string;
  folderCode: string;
  severity: "高" | "中" | "低";
  title: string;
  description: string;
  relatedModules: string[];
  relatedMaterials: string[];
  suggestion: string;
  evidenceChain: EvidenceTrace[];
  createdAt: string;
};

export type AuditLogRecord = {
  id: string;
  projectId?: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  message?: string;
  createdAt: string;
};

/**
 * 12 类标准审计动作类型，任何新操作必须在此枚举中补充。
 */
export type AuditAction =
  | "project.create" | "project.update" | "project.soft_delete" | "project.restore"
  | "material.upload" | "material.view" | "material.replace_version" | "material.modify_metadata"
  | "material.soft_delete" | "material.restore" | "material.permanent_delete" | "material.remove_from_review"
  | "material.link_module" | "material.unlink_module" | "material.set_effective_version"
  | "module.interpret" | "module.confirm"
  | "review.create"
  | "report.generate"
  | "ai_qa.reference"
  | string;

export type AiQaEvidenceSource = {
  type: "project" | "folder" | "module" | "material" | "report" | "risk" | "interpretation";
  id: string;
  label: string;
  folderCode?: string;
  moduleCode?: string;
  timestamp?: string;
};

const projects = new Map<string, ProjectRecord>();
const folders = new Map<string, ProjectFolderRecord[]>();
const materials = new Map<string, MaterialObjectRecord>();
const materialVersions = new Map<string, MaterialVersionRecord>();
const jobs = new Map<string, ReviewJobRecord>();
const reports = new Map<string, ReviewReportRecord>();
const interpretations = new Map<string, ModuleInterpretationRecord>();
const bomCheckResults = new Map<string, BomDrawingCheckResult>();
const aiQaRecords: AiQaRecord[] = [];
const auditLogs: AuditLogRecord[] = [];

export const platformStore = {
  listProjects(includeDeleted = false) {
    return [...projects.values()].filter((project) => includeDeleted || !project.deletedAt);
  },

  createProject(input: { name: string; productCode?: string; description?: string }) {
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: createId("project"),
      name: input.name,
      productCode: input.productCode,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };
    projects.set(project.id, project);
    folders.set(project.id, buildDefaultProjectFolders().map((folder) => ({
      ...folder,
      id: createId("folder"),
      projectId: project.id,
      materialCount: 0,
      reportCount: 0,
    })));
    writeAudit(project.id, "project.create", "Project", project.id, `创建项目 ${project.name}`);
    return project;
  },

  getProject(projectId: string) {
    return projects.get(projectId);
  },

  updateProject(projectId: string, input: Partial<Pick<ProjectRecord, "name" | "productCode" | "description">>) {
    const project = requireProject(projectId);
    const updated = { ...project, ...input, updatedAt: new Date().toISOString() };
    projects.set(projectId, updated);
    writeAudit(projectId, "project.update", "Project", projectId, `更新项目 ${updated.name}`);
    return updated;
  },

  softDeleteProject(projectId: string) {
    const project = requireProject(projectId);
    const deletion = describeProjectSoftDelete(projectId);
    const updated = { ...project, deletedAt: deletion.deletedAt.toISOString(), updatedAt: new Date().toISOString() };
    projects.set(projectId, updated);
    writeAudit(projectId, deletion.auditAction, "Project", projectId, `软删除项目，保留 ${deletion.keeps.join("、")}`);
    return updated;
  },

  restoreProject(projectId: string) {
    const project = requireProject(projectId);
    const updated = { ...project, deletedAt: undefined, updatedAt: new Date().toISOString() };
    projects.set(projectId, updated);
    writeAudit(projectId, "project.restore", "Project", projectId, "恢复软删除项目");
    return updated;
  },

  listFolders(projectId: string) {
    requireProject(projectId);
    return folders.get(projectId) ?? [];
  },

  getFolder(projectId: string, folderCode: string) {
    return this.listFolders(projectId).find((folder) => folder.code === folderCode);
  },

  listModules(projectId: string, folderCode: string): ReviewModuleRecord[] {
    requireProject(projectId);
    return getModulesByFolder(folderCode).map((moduleConfig) => {
      const moduleMaterials = this.listMaterials(projectId, folderCode).filter((material) => material.moduleCodes.includes(moduleConfig.code));
      const moduleInterpretations = this.listModuleInterpretations(projectId, folderCode, moduleConfig.code);
      const moduleReports = this.listReports(projectId, folderCode).filter((report) => report.moduleCode === moduleConfig.code);
      return {
        ...moduleConfig,
        status: getModuleStatus(moduleConfig, moduleMaterials, moduleInterpretations),
        materialCount: moduleMaterials.length,
        interpretationCount: moduleInterpretations.length,
        reportCount: moduleReports.length,
      };
    });
  },

  addMaterial(projectId: string, input: MaterialObjectInput) {
    const folder = this.getFolder(projectId, input.folderCode);
    if (!folder) throw new Error("分类目录不存在");
    const now = new Date().toISOString();
    const materialId = createId("material");
    const versionTag = inferMaterialVersion(input.name) || "V1";
    const version: MaterialVersionRecord = {
      id: createId("version"),
      materialId,
      projectId,
      versionTag,
      name: input.name,
      storagePath: input.storagePath,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
      uploadedAt: now,
      note: "初始版本",
    };
    materialVersions.set(version.id, version);
    const material: MaterialObjectRecord = {
      id: materialId,
      projectId,
      folderCode: input.folderCode,
      moduleCodes: normalizeModuleCodes(input.folderCode, input.moduleCodes),
      type: input.type,
      name: input.name,
      originalName: input.name,
      storagePath: input.storagePath,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
      createdAt: now,
      effectiveVersion: versionTag,
      versionIds: [version.id],
      activeVersionId: version.id,
    };
    materials.set(material.id, material);
    updateFolderStats(projectId, input.folderCode);
    writeAudit(projectId, "material.upload", "MaterialObject", material.id, `上传资料对象 ${material.name}（${versionTag}）`);
    return material;
  },

  listMaterials(projectId: string, folderCode?: string, includeDeleted = false) {
    return [...materials.values()].filter((material) =>
      material.projectId === projectId &&
      (!folderCode || material.folderCode === folderCode) &&
      (includeDeleted || (!material.deletedAt && !material.permanentlyDeletedAt)),
    );
  },

  linkMaterialToModule(materialId: string, moduleCode: string) {
    const material = requireMaterial(materialId);
    const moduleCodes = Array.from(new Set([...material.moduleCodes, moduleCode]));
    const updated = { ...material, moduleCodes };
    materials.set(materialId, updated);
    writeAudit(material.projectId, "material.link_module", "MaterialObject", material.id, `资料对象关联模块 ${moduleCode}`);
    return updated;
  },

  unlinkMaterialFromModule(materialId: string, moduleCode: string) {
    const material = requireMaterial(materialId);
    const moduleCodes = material.moduleCodes.filter((code) => code !== moduleCode);
    const updated = { ...material, moduleCodes };
    materials.set(materialId, updated);
    writeAudit(material.projectId, "material.unlink_module", "MaterialObject", material.id, `资料对象取消关联模块 ${moduleCode}`);
    return updated;
  },

  deleteMaterial(materialId: string, action: MaterialDeleteAction) {
    const material = requireMaterial(materialId);
    const deletion = describeMaterialDeletion(action);
    if (action === "从本次审查移除") {
      writeAudit(material.projectId, "material.remove_from_review", "MaterialObject", material.id, "从本次审查移除资料对象");
      return { material, deletion };
    }

    const now = new Date().toISOString();
    const updated: MaterialObjectRecord = action === "彻底删除"
      ? { ...material, permanentlyDeletedAt: now }
      : { ...material, deletedAt: now };
    materials.set(materialId, updated);
    updateFolderStats(material.projectId, material.folderCode);
    writeAudit(material.projectId, action === "彻底删除" ? "material.permanent_delete" : "material.soft_delete", "MaterialObject", material.id, action);
    return { material: updated, deletion };
  },

  restoreMaterial(materialId: string) {
    const material = requireMaterial(materialId);
    const updated = { ...material, deletedAt: undefined };
    materials.set(materialId, updated);
    updateFolderStats(material.projectId, material.folderCode);
    writeAudit(material.projectId, "material.restore", "MaterialObject", material.id, "从回收站恢复资料对象");
    return updated;
  },

  listRecycleBin() {
    return [...materials.values()].filter((material) => material.deletedAt && !material.permanentlyDeletedAt);
  },

  createReview(projectId: string, folderCode: string | undefined, reviewType: string) {
    const project = requireProject(projectId);
    const folder = folderCode ? this.getFolder(projectId, folderCode) : undefined;
    if (folderCode && !folder) throw new Error("分类目录不存在");
    const now = new Date().toISOString();
    const job: ReviewJobRecord = {
      id: createId("review"),
      projectId,
      folderCode,
      reviewType,
      status: "succeeded",
      reportBaseName: buildFolderReportBaseName({
        projectName: project.name,
        folderName: folder?.name ?? "全项目",
        reviewType,
        date: now.slice(0, 10).replace(/-/g, ""),
      }),
      createdAt: now,
    };
    jobs.set(job.id, job);
    const moduleRows = this.listModules(projectId, folderCode ?? "");
    const conflicts = folderCode ? this.checkCrossModuleConflicts(projectId, folderCode) : [];
    const report: ReviewReportRecord = {
      id: createId("report"),
      projectId,
      folderCode,
      reviewJobId: job.id,
      baseName: job.reportBaseName,
      title: `${folder?.name ?? "全项目"} ${reviewType}报告`,
      markdownContent: buildReviewMarkdown(project, folder, job, this.listMaterials(projectId, folderCode), moduleRows, conflicts),
      createdAt: now,
    };
    reports.set(report.id, report);
    if (folderCode) setFolderStatus(projectId, folderCode, "已出报告");
    writeAudit(projectId, "review.create", "ReviewJob", job.id, `创建审查任务 ${job.reportBaseName}`);
    return job;
  },

  listReports(projectId: string, folderCode?: string) {
    return [...reports.values()].filter((report) =>
      report.projectId === projectId &&
      (!folderCode || report.folderCode === folderCode),
    );
  },

  createModuleInterpretation(projectId: string, folderCode: string, moduleCode: string, reviewType = "模块深度解读") {
    const project = requireProject(projectId);
    const folder = this.getFolder(projectId, folderCode);
    if (!folder) throw new Error("分类目录不存在");
    const moduleConfig = reviewModules.find((item) => item.folderCode === folderCode && item.code === moduleCode);
    if (!moduleConfig) throw new Error("模块不存在");

    const moduleMaterials = this.listMaterials(projectId, folderCode).filter((material) => material.moduleCodes.includes(moduleCode));
    const evidenceChain = buildEvidenceChain(projectId, folderCode, moduleCode, moduleMaterials, "明确陈述");
    const admissionResult = evaluateAdmission(moduleConfig, moduleMaterials);
    const missingItems = admissionResult.passed ? [] : admissionResult.missingConditions;
    const risks = buildDeepRisks(moduleConfig, moduleMaterials, admissionResult);
    const now = new Date().toISOString();
    const interpretation: ModuleInterpretationRecord = {
      id: createId("module_interpretation"),
      projectId,
      folderCode,
      moduleCode,
      moduleName: moduleConfig.name,
      status: moduleMaterials.length === 0 ? "需补充/有风险" : "已解读",
      materialStatus: moduleMaterials.length > 0 ? "已上传" : "未上传",
      recognizedMaterials: moduleMaterials.map((material) => material.name),
      coreSummary: moduleMaterials.length > 0
        ? `已识别 ${moduleMaterials.length} 个资料对象，当前模块可形成初步工程判断。`
        : "当前模块尚未识别到资料对象，只能输出缺失项和补充建议。",
      sourceType: moduleMaterials.length > 0 ? "明确陈述" : "未知",
      structuralJudgment: moduleMaterials.length > 0
        ? `${moduleConfig.name}已有资料输入，可进入阶段级审查；仍需人工确认关键结论。`
        : `${moduleConfig.name}资料不足，暂不能作为可靠结构设计输入。`,
      risks,
      missingItems,
      evidenceChain,
      admissionResult,
      confirmationQuestions: moduleConfig.affectsStageGate
        ? [`请确认 ${moduleConfig.name} 是否满足当前阶段准入条件。`]
        : [`请确认 ${moduleConfig.name} 是否适用于本项目。`],
      suggestedActions: buildSuggestedActions(moduleConfig, missingItems),
      confidence: admissionResult.passed ? "中" : moduleMaterials.length > 0 ? "低" : "未知",
      blocksStage: moduleConfig.affectsStageGate && !admissionResult.passed,
      createdAt: now,
    };
    interpretations.set(interpretation.id, interpretation);

    const reportBaseName = buildModuleReportBaseName({
      projectName: project.name,
      folderName: folder.name,
      moduleName: moduleConfig.name,
      reviewType,
      timestamp: now.slice(0, 16).replace(/[-:T]/g, "_"),
    });
    const report: ReviewReportRecord = {
      id: createId("report"),
      projectId,
      folderCode,
      moduleCode,
      reviewJobId: interpretation.id,
      baseName: reportBaseName,
      title: `${moduleConfig.name}${reviewType}`,
      markdownContent: buildModuleMarkdown(project, folder, interpretation),
      createdAt: now,
    };
    reports.set(report.id, report);
    writeAudit(projectId, "module.interpret", "ReviewModule", moduleCode, `生成模块解读 ${reportBaseName}`);
    return { interpretation, report };
  },

  confirmModuleInterpretation(projectId: string, folderCode: string, moduleCode: string) {
    const latest = this.listModuleInterpretations(projectId, folderCode, moduleCode)[0];
    if (!latest) throw new Error("模块尚未解读，不能人工确认");
    const updated = { ...latest, status: "人工已确认" as const, confirmedAt: new Date().toISOString(), blocksStage: false };
    interpretations.set(latest.id, updated);
    writeAudit(projectId, "module.confirm", "ReviewModule", moduleCode, "人工确认模块解读结果");
    return updated;
  },

  listModuleInterpretations(projectId: string, folderCode: string, moduleCode?: string) {
    return [...interpretations.values()]
      .filter((item) => item.projectId === projectId && item.folderCode === folderCode && (!moduleCode || item.moduleCode === moduleCode))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  checkCrossModuleConflicts(projectId: string, folderCode: string): CrossModuleConflictRecord[] {
    const folderMaterials = this.listMaterials(projectId, folderCode);
    const namesByModule = (moduleCode: string) => folderMaterials
      .filter((material) => material.moduleCodes.includes(moduleCode))
      .flatMap((material) => extractEngineeringNames(material.name));

    const conflicts: CrossModuleConflictRecord[] = [];
    if (folderCode === "MED_004") {
      const drawingNames = new Set([...namesByModule("drawing-package"), ...namesByModule("critical-dimensions")]);
      const bomNames = new Set(namesByModule("bom-part-list"));
      const drawingOnly = [...drawingNames].filter((name) => !bomNames.has(name));
      const bomOnly = [...bomNames].filter((name) => !drawingNames.has(name));
      if (drawingNames.size > 0 && bomNames.size > 0 && (drawingOnly.length > 0 || bomOnly.length > 0)) {
        conflicts.push({
          id: createId("conflict"),
          projectId,
          folderCode,
          severity: "中",
          title: "2D/3D图纸与BOM/Part list名称对应疑似不一致",
          description: `图纸侧未在BOM中匹配：${drawingOnly.slice(0, 8).join("、") || "无"}；BOM侧未在图纸中匹配：${bomOnly.slice(0, 8).join("、") || "无"}。`,
          relatedModules: ["drawing-package", "critical-dimensions", "bom-part-list"],
          relatedMaterials: folderMaterials.map((material) => material.name),
          suggestion: "建议核对2D、3D、BOM/Part list的零件名称、编号、版本和材料，确认是否存在漏图、漏BOM、旧版本或命名不一致。",
          evidenceChain: buildEvidenceChain(projectId, folderCode, "cross-module-conflict", folderMaterials, "上下文推断"),
          createdAt: new Date().toISOString(),
        });
      }
    }
    return conflicts;
  },

  getMissingHints(projectId: string, folderCode: string) {
    const folder = this.getFolder(projectId, folderCode);
    if (!folder) throw new Error("分类目录不存在");
    const activeMaterials = this.listMaterials(projectId, folderCode);
    const hints = buildMissingHints(folder, activeMaterials, this.listModules(projectId, folderCode));
    if (hints.length > 0) setFolderStatus(projectId, folderCode, "需补充", false);
    return hints;
  },

  listAuditLogs(projectId?: string) {
    return projectId
      ? auditLogs.filter((log) => log.projectId === projectId)
      : auditLogs;
  },

  getMaterialDetail(materialId: string) {
    const material = requireMaterial(materialId);
    writeAudit(material.projectId, "material.view", "MaterialObject", material.id, `查看资料对象 ${material.name}`);
    const versions = material.versionIds.map((versionId) => materialVersions.get(versionId)).filter(Boolean) as MaterialVersionRecord[];
    const materialReports = [...reports.values()].filter((report) =>
      [...interpretations.values()].some((interp) =>
        interp.projectId === material.projectId &&
        interp.evidenceChain.some((ev) => ev.materialObjectId === material.id),
      ) && report.projectId === material.projectId,
    );
    const materialAuditLogs = auditLogs.filter((log) => log.targetId === material.id);
    return { material, versions, reports: materialReports, auditLogs: materialAuditLogs };
  },

  addMaterialVersion(materialId: string, input: {
    name: string; storagePath?: string; sizeBytes?: number;
    mimeType?: string; versionTag?: string; note?: string;
  }) {
    const material = requireMaterial(materialId);
    const newTag = input.versionTag ?? incrementVersionTag(material.effectiveVersion ?? "V1");
    const now = new Date().toISOString();
    const version: MaterialVersionRecord = {
      id: createId("version"),
      materialId,
      projectId: material.projectId,
      versionTag: newTag,
      name: input.name,
      storagePath: input.storagePath,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
      uploadedAt: now,
      note: input.note ?? "新版本",
    };
    materialVersions.set(version.id, version);
    const updated: MaterialObjectRecord = {
      ...material,
      name: input.name,
      storagePath: input.storagePath,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
      effectiveVersion: newTag,
      versionIds: [...material.versionIds, version.id],
      activeVersionId: version.id,
    };
    materials.set(materialId, updated);
    writeAudit(material.projectId, "material.replace_version", "MaterialObject", material.id, `上传新版本 ${newTag}：${input.name}`);
    return { material: updated, version };
  },

  setMaterialEffectiveVersion(materialId: string, versionId: string) {
    const material = requireMaterial(materialId);
    const version = materialVersions.get(versionId);
    if (!version || version.materialId !== materialId) throw new Error("版本不存在或不属于该资料对象");
    const updated: MaterialObjectRecord = {
      ...material,
      name: version.name,
      storagePath: version.storagePath,
      sizeBytes: version.sizeBytes,
      mimeType: version.mimeType,
      effectiveVersion: version.versionTag,
      activeVersionId: versionId,
    };
    materials.set(materialId, updated);
    writeAudit(material.projectId, "material.set_effective_version", "MaterialObject", material.id, `设置有效版本为 ${version.versionTag}`);
    return { material: updated, version };
  },

  updateMaterialMetadata(materialId: string, input: { metadata?: string; name?: string }) {
    const material = requireMaterial(materialId);
    const updated = { ...material, ...input };
    materials.set(materialId, updated);
    writeAudit(material.projectId, "material.modify_metadata", "MaterialObject", material.id, `修改元数据: ${JSON.stringify(input)}`);
    return updated;
  },

  listMaterialVersions(materialId: string) {
    const material = requireMaterial(materialId);
    return material.versionIds.map((versionId) => materialVersions.get(versionId)).filter(Boolean) as MaterialVersionRecord[];
  },

  runBomDrawingCheck(projectId: string, folderCode: string) {
    const folderMaterials = this.listMaterials(projectId, folderCode);
    const result = runBomDrawingCheckLogic(projectId, folderCode, folderMaterials);
    bomCheckResults.set(result.id, result);
    writeAudit(projectId, "module.interpret", "BomCheck", result.id, `BOM/图纸专项检查: ${result.checkedPrefix}`);
    return result;
  },

  listBomCheckResults(projectId: string, folderCode: string) {
    return [...bomCheckResults.values()].filter(
      (result) => result.projectId === projectId && result.folderCode === folderCode,
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  createAiQa(input: {
    scope: "project" | "global";
    projectId?: string;
    question: string;
    userId?: string;
  }) {
    const qa = buildAiQaAnswer(input);
    aiQaRecords.unshift(qa);
    if (input.projectId) {
      writeAudit(input.projectId, "ai_qa.reference", "AiQa", qa.id, `AI问答: ${input.question.slice(0, 60)}`);
    }
    return qa;
  },

  listAiQa(projectId?: string, scope?: "project" | "global") {
    return aiQaRecords.filter((qa) =>
      (!projectId || qa.projectId === projectId) &&
      (!scope || qa.scope === scope),
    );
  },

  buildRelationGraph(projectId: string, folderCode: string) {
    const folderMaterials = this.listMaterials(projectId, folderCode);
    return buildRelationGraphLogic(projectId, folderCode, folderMaterials, this.listModuleInterpretations(projectId, folderCode));
  },
};

function requireProject(projectId: string): ProjectRecord {
  const project = projects.get(projectId);
  if (!project) throw new Error("项目不存在");
  return project;
}

function requireMaterial(materialId: string): MaterialObjectRecord {
  const material = materials.get(materialId);
  if (!material) throw new Error("资料对象不存在");
  return material;
}

function updateFolderStats(projectId: string, folderCode: string) {
  const folderRows = folders.get(projectId) ?? [];
  const updatedFolders = folderRows.map((folder) => {
    if (folder.code !== folderCode) return folder;
    const activeMaterials = [...materials.values()].filter((material) =>
      material.projectId === projectId &&
      material.folderCode === folderCode &&
      !material.deletedAt &&
      !material.permanentlyDeletedAt,
    );
    return {
      ...folder,
      materialCount: activeMaterials.length,
      status: activeMaterials.length > 0 ? "已上传" as const : "未上传" as const,
    };
  });
  folders.set(projectId, updatedFolders);
}

function setFolderStatus(projectId: string, folderCode: string, status: FolderStatus, incrementReport = true) {
  folders.set(projectId, (folders.get(projectId) ?? []).map((folder) =>
    folder.code === folderCode ? { ...folder, status, reportCount: incrementReport ? folder.reportCount + 1 : folder.reportCount } : folder,
  ));
}

function writeAudit(projectId: string | undefined, action: AuditAction, targetType: string, targetId?: string, message?: string) {
  auditLogs.unshift({
    id: createId("audit"),
    projectId,
    action,
    targetType,
    targetId,
    message,
    createdAt: new Date().toISOString(),
  });
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildReviewMarkdown(
  project: ProjectRecord,
  folder: ProjectFolderRecord | undefined,
  job: ReviewJobRecord,
  activeMaterials: MaterialObjectRecord[],
  moduleRows: ReviewModuleRecord[] = [],
  conflicts: CrossModuleConflictRecord[] = [],
) {
  const materialLines = activeMaterials.length > 0
    ? activeMaterials.map((material) => `- ${material.name}（${material.type}）`).join("\n")
    : "- 当前分类暂无资料对象";
  const moduleLines = moduleRows.length > 0
    ? moduleRows.map((moduleRow) => `- ${moduleRow.name}: ${moduleRow.status}，资料 ${moduleRow.materialCount}，解读 ${moduleRow.interpretationCount}，${moduleRow.affectsStageGate ? "影响阶段准入" : "不直接阻塞阶段"}`).join("\n")
    : "- 当前无模块配置";
  const conflictLines = conflicts.length > 0
    ? conflicts.map((conflict) => `- [${conflict.severity}] ${conflict.title}: ${conflict.description}`).join("\n")
    : "- 暂未发现跨模块冲突。";

  return [
    `# ${job.reportBaseName}`,
    "",
    `- 项目：${project.name}`,
    `- 审查文件夹：${folder?.name ?? "全项目"}`,
    `- 审查类型：${job.reviewType}`,
    `- 审查时间：${job.createdAt}`,
    "",
    "## 资料对象",
    "",
    materialLines,
    "",
    "## 第一层：模块级摘要",
    "",
    moduleLines,
    "",
    "## 第二层：M0-M9 综合结论",
    "",
    activeMaterials.length > 0
      ? "当前分类已有资料对象和模块级中间结论。M0-M9 总审查应优先消费模块解读结果，再形成正式风险、DFM、ECO、测试闭环、阶段准入和归档建议。"
      : "当前分类暂无资料，无法形成有效审查结论。",
    "",
    "## 跨模块冲突检查",
    "",
    conflictLines,
  ].join("\n");
}

function buildMissingHints(folder: ProjectFolderRecord, activeMaterials: MaterialObjectRecord[], moduleRows: ReviewModuleRecord[] = []) {
  const names = activeMaterials.map((material) => material.name).join("\n");
  const hints: string[] = [];

  if (activeMaterials.length === 0) {
    hints.push("当前分类未上传资料，请先上传文件、文件夹、压缩包或批量文件。");
  }

  for (const moduleRow of moduleRows) {
    if (moduleRow.required && moduleRow.materialCount === 0) {
      hints.push(`必传模块「${moduleRow.name}」尚未上传资料，建议补充：${moduleRow.recommendedMaterials.join("、")}。`);
    }
    if (moduleRow.required && moduleRow.status !== "人工已确认" && moduleRow.affectsStageGate) {
      hints.push(`模块「${moduleRow.name}」尚未人工确认，不能自动视为阶段通过依据。`);
    }
  }

  if (folder.code === "MED_001" && !/PRD|需求|可靠性|法规|清洁|消毒/i.test(names)) {
    hints.push("需求受付建议补充 PRD、用户需求、可靠性、法规或清洁消毒要求。");
  }

  if (folder.code === "MED_004" && !/2D|图纸|BOM|Part|DFM|公差/i.test(names)) {
    hints.push("详细设计建议补充 2D图纸、详细BOM/Part list、关键尺寸、公差或DFM资料。");
  }

  if (folder.code === "MED_005_007_01" && !/ECO|ECN|变更|验证|会签/i.test(names)) {
    hints.push("ECN分类建议补充 ECO/ECN申请、变更前后对比、影响分析、验证计划和会签记录。");
  }

  if (folder.code === "MED_005_007_02" && !/测试|跌落|振动|寿命|复测|验证/i.test(names)) {
    hints.push("测试报告分类建议补充结构相关测试报告、失败项、原因分析和复测结论。");
  }

  if (hints.length === 0) {
    hints.push("当前分类未发现明显缺失项，可继续发起审查；最终结论仍需结构工程师确认。");
  }

  return hints;
}

function normalizeModuleCodes(folderCode: string, moduleCodes: string[] | undefined): string[] {
  const allowedModules = getModulesByFolder(folderCode);
  const allowedCodes = new Set(allowedModules.map((moduleConfig) => moduleConfig.code));
  const normalized = (moduleCodes ?? []).filter((moduleCode) => allowedCodes.has(moduleCode));
  if (normalized.length > 0) return Array.from(new Set(normalized));
  return allowedModules[0] ? [allowedModules[0].code] : [];
}

function getModuleStatus(
  moduleConfig: ReviewModuleConfig,
  moduleMaterials: MaterialObjectRecord[],
  moduleInterpretations: ModuleInterpretationRecord[],
): ModuleStatus {
  const latest = moduleInterpretations[0];
  if (latest?.status === "人工已确认") return "人工已确认";
  if (latest?.blocksStage || latest?.status === "需补充/有风险") return "需补充/有风险";
  if (latest) return "已解读";
  if (moduleMaterials.length > 0) return "已上传";
  return moduleConfig.required ? "未上传" : "未上传";
}

function buildModuleMarkdown(
  project: ProjectRecord,
  folder: ProjectFolderRecord,
  interpretation: ModuleInterpretationRecord,
) {
  return [
    `# ${project.name}_${folder.name}_${interpretation.moduleName}_模块深度解读`,
    "",
    `- 模块名称：${interpretation.moduleName}`,
    `- 资料状态：${interpretation.materialStatus}`,
    `- 置信度：${interpretation.confidence}`,
    `- 是否阻塞当前阶段：${interpretation.blocksStage ? "是" : "否"}`,
    `- 信息来源：${interpretation.sourceType}`,
    `- 准入结论：${interpretation.admissionResult.conclusion}`,
    "",
    "## 已识别资料",
    interpretation.recognizedMaterials.length > 0 ? interpretation.recognizedMaterials.map((item) => `- ${item}`).join("\n") : "- 未识别到资料",
    "",
    "## 核心内容摘要",
    interpretation.coreSummary,
    "",
    "## 结构相关判断",
    interpretation.structuralJudgment,
    "",
    "## 风险点",
    interpretation.risks.map((item) => `- ${item}`).join("\n"),
    "",
    "## 缺失项",
    interpretation.missingItems.length > 0 ? interpretation.missingItems.map((item) => `- ${item}`).join("\n") : "- 暂无明显缺失项",
    "",
    "## 需确认问题",
    interpretation.confirmationQuestions.map((item) => `- ${item}`).join("\n"),
    "",
    "## 建议动作",
    interpretation.suggestedActions.map((item) => `- ${item}`).join("\n"),
    "",
    "## 证据链",
    interpretation.evidenceChain.map((evidence) => `- 项目:${evidence.projectId} / 阶段:${evidence.folderCode} / 模块:${evidence.moduleCode} / 资料:${evidence.materialName ?? "未知"} / 版本:${evidence.materialVersion ?? "未知"} / 解读:${evidence.interpretationId ?? interpretation.id} / 来源:${evidence.sourceType}`).join("\n"),
  ].join("\n");
}

function evaluateAdmission(moduleConfig: ReviewModuleConfig, moduleMaterials: MaterialObjectRecord[]) {
  const evidenceText = moduleMaterials.map((material) => material.name).join("\n");
  const missingConditions = moduleConfig.minimumReviewConditions.filter((condition) =>
    !conditionSatisfied(condition, evidenceText, moduleMaterials),
  );
  const passed = moduleMaterials.length > 0 && missingConditions.length === 0;
  return {
    passed,
    missingConditions,
    conclusion: passed
      ? "满足最低可审查条件，可以形成初步工程判断，但仍需人工确认。"
      : `资料不足，无法形成可靠的${moduleConfig.name}风险判断。`,
  };
}

function conditionSatisfied(condition: string, evidenceText: string, moduleMaterials: MaterialObjectRecord[]) {
  if (condition.includes("至少上传") || condition.includes("有资料")) return moduleMaterials.length > 0;
  if (condition.includes("测试项目")) return /测试|跌落|振动|寿命|环境|包装|可靠性|验证/i.test(evidenceText);
  if (condition.includes("判定标准") || condition.includes("验收准则")) return /标准|判定|准则|规格|要求|pass|fail|合格/i.test(evidenceText);
  if (condition.includes("适用场景") || condition.includes("使用环境")) return /场景|环境|使用|运输|包装|跌落/i.test(evidenceText);
  if (condition.includes("2D") || condition.includes("3D") || condition.includes("STEP") || condition.includes("PRT")) return /2D|3D|STEP|PRT|图纸|drawing/i.test(evidenceText);
  if (condition.includes("BOM") || condition.includes("零件")) return /BOM|Part|零件|物料|料号/i.test(evidenceText);
  if (condition.includes("版本")) return /Rev|V\d|版本|版|ver/i.test(evidenceText);
  if (condition.includes("变更")) return /ECO|ECN|变更|change/i.test(evidenceText);
  if (condition.includes("会签") || condition.includes("审批")) return /会签|审批|批准|sign|approve/i.test(evidenceText);
  if (condition.includes("原因分析")) return /原因|root|cause|分析/i.test(evidenceText);
  return moduleMaterials.length > 0 && moduleConfigKeywordHit(condition, evidenceText);
}

function moduleConfigKeywordHit(condition: string, evidenceText: string) {
  return condition.split(/[、/ ]/).some((part) => part.length >= 2 && evidenceText.includes(part));
}

function buildDeepRisks(
  moduleConfig: ReviewModuleConfig,
  moduleMaterials: MaterialObjectRecord[],
  admissionResult: { passed: boolean; missingConditions: string[]; conclusion: string },
) {
  if (!admissionResult.passed) {
    return [
      admissionResult.conclusion,
      `未满足最低可审查条件：${admissionResult.missingConditions.join("、") || "缺少有效资料对象"}`,
      ...moduleConfig.commonRisks.slice(0, 2),
    ];
  }
  return [
    `${moduleConfig.name}已具备初步解读条件，但需继续核对资料版本和适用范围。`,
    ...moduleConfig.commonRisks.slice(0, 2),
    `当前判断基于 ${moduleMaterials.length} 个资料对象，正式结论需保留证据链并经人工确认。`,
  ];
}

function buildSuggestedActions(moduleConfig: ReviewModuleConfig, missingItems: string[]) {
  if (missingItems.length > 0) {
    return [
      `补充最低可审查条件：${missingItems.join("、")}`,
      `推荐补充资料：${moduleConfig.recommendedMaterials.join("、")}`,
      "补充后重新执行模块深度解读。",
    ];
  }
  return [
    "核对资料版本、适用范围和来源可信度。",
    "由结构工程师执行人工确认。",
    "将模块解读结果纳入阶段级审查和M0-M9综合审查。",
  ];
}

function buildEvidenceChain(
  projectId: string,
  folderCode: string,
  moduleCode: string,
  moduleMaterials: MaterialObjectRecord[],
  sourceType: EvidenceTrace["sourceType"],
): EvidenceTrace[] {
  if (moduleMaterials.length === 0) {
    return [{ projectId, folderCode, moduleCode, sourceType: "未知", excerpt: "未识别到资料对象" }];
  }
  return moduleMaterials.map((material) => ({
    projectId,
    folderCode,
    moduleCode,
    materialObjectId: material.id,
    materialName: material.name,
    materialVersion: inferMaterialVersion(material.name),
    sourceType,
    excerpt: material.name,
  }));
}

function inferMaterialVersion(name: string) {
  return name.match(/(?:Rev[A-Z0-9]+|V\d+(?:\.\d+)*|版本[\w.-]+)/i)?.[0] ?? "未知";
}

function incrementVersionTag(current: string): string {
  const revMatch = current.match(/^Rev([A-Z])$/i);
  if (revMatch) {
    const next = String.fromCharCode(revMatch[1].toUpperCase().charCodeAt(0) + 1);
    return `Rev${next}`;
  }
  const vMatch = current.match(/^V(\d+)(?:\.(\d+))?/i);
  if (vMatch) {
    const major = parseInt(vMatch[1], 10);
    return `V${major + 1}`;
  }
  return `${current}_new`;
}

function extractEngineeringNames(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  const tokens = base.split(/[_\-\s（）()【】\[\]]+/).filter((token) => token.length >= 2);
  return tokens
    .filter((token) => !/^(MED|Rev|V\d|2D|3D|BOM|Part|list|图纸|详细设计)$/i.test(token))
    .slice(0, 12);
}

/**
 * 规范化文件名用于比对：忽略扩展名、空格、大小写
 */
function normalizeName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/\s/g, "").toLowerCase();
}

/**
 * 计算两个字符串的相似度（0-1）
 */
function stringSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.length === 0) return 1;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

/**
 * BOM/图纸专项对应检查核心逻辑
 * 支持 HA1_DE / HA1_CB 前缀，优先按前缀匹配 sheet，找不到则自动识别 Part list sheet。
 */
function runBomDrawingCheckLogic(
  projectId: string,
  folderCode: string,
  folderMaterials: MaterialObjectRecord[],
): BomDrawingCheckResult {
  const now = new Date().toISOString();

  // 识别图纸文件（2D / 3D），以及 BOM/Part list 文件
  const drawing2dFiles = folderMaterials.filter((material) =>
    /HA1_DE|HA1_CB/i.test(material.name) && /2D|dwg|dxf|pdf/i.test(material.name),
  );
  const drawing3dFiles = folderMaterials.filter((material) =>
    /HA1_DE|HA1_CB/i.test(material.name) && /3D|stp|step|sldprt|prt|iges|igs/i.test(material.name),
  );
  const bomFiles = folderMaterials.filter((material) =>
    /BOM|Part.?list|料单|物料/i.test(material.name) && /xlsx|xls|csv/i.test(material.name),
  );

  // 从图纸名称提取前缀（HA1_DE / HA1_CB / 其他）
  const prefixes = new Set<string>();
  for (const file of [...drawing2dFiles, ...drawing3dFiles]) {
    const match = file.name.match(/^(HA1_[A-Z]{2,})/i);
    if (match) prefixes.add(match[1].toUpperCase());
  }
  const checkedPrefix = prefixes.size > 0 ? [...prefixes].join(" / ") : "HA1_DE";

  // 模拟 BOM sheet 识别：从 BOM 文件名中推断 sheet
  let usedSheet = checkedPrefix.split(" / ")[0] ?? "HA1_DE";
  let sheetIsAutoDetected = false;
  if (bomFiles.length > 0) {
    const bomName = bomFiles[0].name;
    const hasExactSheet = [...prefixes].some((prefix) => new RegExp(prefix, "i").test(bomName));
    if (!hasExactSheet) {
      usedSheet = "Part list (自动识别)";
      sheetIsAutoDetected = true;
    }
  }

  // 提取 2D/3D 图纸文件名集合（规范化）
  const drawing2dNames = new Map(drawing2dFiles.map((file) => [normalizeName(file.name), file.name]));
  const drawing3dNames = new Map(drawing3dFiles.map((file) => [normalizeName(file.name), file.name]));

  // 从 BOM 文件名推断 BOM 中登记的图纸名（模拟：从文件名 tokens 中提取）
  const bomRegistered2d = new Map<string, string>();
  const bomRegistered3d = new Map<string, string>();
  for (const bomFile of bomFiles) {
    const tokens = extractEngineeringNames(bomFile.name);
    for (const token of tokens) {
      if (/2D|dwg|dxf/i.test(token)) bomRegistered2d.set(normalizeName(token), token);
      if (/3D|stp|step|sldprt/i.test(token)) bomRegistered3d.set(normalizeName(token), token);
    }
    // 如果 BOM 文件名带有图纸引用，以 BOM 文件名本身补充
    if (/HA1_DE|HA1_CB/i.test(bomFile.name)) {
      const baseToken = bomFile.name.replace(/\.[^.]+$/, "");
      bomRegistered2d.set(normalizeName(baseToken), baseToken);
      bomRegistered3d.set(normalizeName(baseToken), baseToken);
    }
  }

  // BOM有记录但未上传图纸
  const bomOnly2d = [...bomRegistered2d.keys()].filter((name) => !drawing2dNames.has(name));
  const bomOnly3d = [...bomRegistered3d.keys()].filter((name) => !drawing3dNames.has(name));
  const bomOnlyItems = [...bomOnly2d.map((n) => `[2D] ${bomRegistered2d.get(n)}`), ...bomOnly3d.map((n) => `[3D] ${bomRegistered3d.get(n)}`)];

  // 已上传图纸但 BOM 中未登记
  const drawingOnly2d = [...drawing2dNames.keys()].filter((name) => !bomRegistered2d.has(name));
  const drawingOnly3d = [...drawing3dNames.keys()].filter((name) => !bomRegistered3d.has(name));
  const drawingOnlyItems = [...drawingOnly2d.map((n) => `[2D] ${drawing2dNames.get(n)}`), ...drawingOnly3d.map((n) => `[3D] ${drawing3dNames.get(n)}`)];

  // 名称相似但不完全一致（相似度 0.6-0.99）
  const fuzzyMatches: BomDrawingCheckResult["fuzzyMatches"] = [];
  for (const [dNorm, dOrig] of drawing2dNames) {
    for (const [bNorm, bOrig] of bomRegistered2d) {
      if (dNorm !== bNorm) {
        const sim = stringSimilarity(dNorm, bNorm);
        if (sim >= 0.6 && sim < 1) fuzzyMatches.push({ drawing: dOrig, bom: bOrig, similarity: Math.round(sim * 100) / 100 });
      }
    }
  }

  // 版本号冲突：对比图纸版本和 BOM 版本
  const versionConflicts: BomDrawingCheckResult["versionConflicts"] = [];
  for (const [dNorm, dOrig] of drawing2dNames) {
    const match = bomRegistered2d.get(dNorm);
    if (match) {
      const drawingVersion = inferMaterialVersion(dOrig);
      const bomVersion = inferMaterialVersion(match);
      if (drawingVersion !== "未知" && bomVersion !== "未知" && drawingVersion !== bomVersion) {
        versionConflicts.push({ name: dOrig, drawingVersion, bomVersion });
      }
    }
  }

  // 2D/3D/BOM 三者缺一
  const tripleGaps: string[] = [];
  if (drawing2dFiles.length === 0 && drawing3dFiles.length > 0) tripleGaps.push("已有3D图纸，但缺少对应2D图纸");
  if (drawing3dFiles.length === 0 && drawing2dFiles.length > 0) tripleGaps.push("已有2D图纸，但缺少对应3D图纸");
  if (bomFiles.length === 0 && (drawing2dFiles.length > 0 || drawing3dFiles.length > 0)) tripleGaps.push("已有图纸文件，但缺少BOM/Part list");

  // 疑似同一零件但命名不规范
  const namingIssues: string[] = [];
  for (const [dNorm, dOrig] of drawing2dNames) {
    const dup3d = [...drawing3dNames.keys()].find((n) => stringSimilarity(n, dNorm) >= 0.85 && n !== dNorm);
    if (dup3d) namingIssues.push(`2D"${dOrig}"与3D"${drawing3dNames.get(dup3d)}"命名相似但不一致，疑似同一零件`);
  }

  // 建议动作
  const suggestions: string[] = [];
  if (bomOnlyItems.length > 0) suggestions.push(`补充上传 BOM 中登记但未上传的图纸：${bomOnlyItems.slice(0, 4).join("、")}`);
  if (drawingOnlyItems.length > 0) suggestions.push(`将已上传图纸补录到 BOM：${drawingOnlyItems.slice(0, 4).join("、")}`);
  if (fuzzyMatches.length > 0) suggestions.push(`确认名称相似项是否为同一零件，建议统一命名规范`);
  if (versionConflicts.length > 0) suggestions.push(`核查版本号冲突项，确认图纸版本与BOM版本一致`);
  if (tripleGaps.length > 0) suggestions.push(...tripleGaps.map((gap) => `补充${gap}`));
  if (namingIssues.length > 0) suggestions.push(`修改命名不规范项，建议统一使用 HA1_DE_零件号_版本 格式`);
  if (suggestions.length === 0) suggestions.push("未发现明显冲突，建议人工逐项核查版本和材料一致性");

  return {
    id: createId("bom_check"),
    projectId,
    folderCode,
    checkedPrefix,
    bomOnlyItems,
    drawingOnlyItems,
    fuzzyMatches,
    versionConflicts,
    tripleGaps,
    namingIssues,
    suggestions,
    usedSheet,
    sheetIsAutoDetected,
    createdAt: now,
  };
}

/**
 * AI 问答构建器：基于项目内资料或全局归档资料给出有证据来源的回答。
 * 当前为规则推导实现，不依赖 LLM API，可在后续集成 LLM 时替换此函数。
 */
function buildAiQaAnswer(input: {
  scope: "project" | "global";
  projectId?: string;
  question: string;
}): AiQaRecord {
  const now = new Date().toISOString();
  const evidenceSources: AiQaEvidenceSource[] = [];
  let answer = "";
  let judgability: AiQaRecord["judgability"] = "资料不足";
  const q = input.question.toLowerCase();

  if (input.scope === "project" && input.projectId) {
    const projectMaterials = [...materials.values()].filter(
      (material) => material.projectId === input.projectId && !material.deletedAt && !material.permanentlyDeletedAt,
    );
    const projectInterpretations = [...interpretations.values()].filter(
      (interp) => interp.projectId === input.projectId,
    );
    const projectReports = [...reports.values()].filter(
      (report) => report.projectId === input.projectId,
    );

    evidenceSources.push(...projectMaterials.slice(0, 5).map((material): AiQaEvidenceSource => ({
      type: "material", id: material.id, label: material.name,
      folderCode: material.folderCode, timestamp: material.createdAt,
    })));
    evidenceSources.push(...projectInterpretations.slice(0, 3).map((interp): AiQaEvidenceSource => ({
      type: "interpretation", id: interp.id, label: `${interp.moduleName}解读`,
      folderCode: interp.folderCode, moduleCode: interp.moduleCode, timestamp: interp.createdAt,
    })));

    if (projectMaterials.length === 0) {
      answer = "当前项目尚未上传资料，无法形成基于资料的可靠判断。建议先上传相关资料并完成模块解读后再进行问答。";
      judgability = "资料不足";
    } else if (q.includes("风险") || q.includes("问题")) {
      const risks = projectInterpretations.flatMap((interp) => interp.risks).slice(0, 6);
      answer = risks.length > 0
        ? `基于当前已上传的 ${projectMaterials.length} 个资料对象和 ${projectInterpretations.length} 次模块解读，识别到以下潜在风险：\n${risks.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\n以上结论仅供参考，最终判断需由结构工程师人工确认。`
        : `当前共有 ${projectMaterials.length} 个资料对象，但尚未执行模块深度解读，无法识别具体风险。建议先对各模块执行解读。`;
      judgability = risks.length > 0 ? "部分可判断" : "资料不足";
    } else if (q.includes("缺失") || q.includes("缺少")) {
      const missing = projectInterpretations.flatMap((interp) => interp.missingItems).slice(0, 5);
      answer = missing.length > 0
        ? `基于模块解读结果，当前项目识别到以下缺失项：\n${missing.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\n注意：AI 无法自动补全缺失资料，须由项目组确认和补充。`
        : "当前模块解读未发现明显缺失项，但结论不代表全部充分，仍需人工审阅。";
      judgability = missing.length > 0 ? "部分可判断" : "部分可判断";
    } else if (q.includes("报告") || q.includes("结论")) {
      answer = projectReports.length > 0
        ? `当前项目已生成 ${projectReports.length} 份报告。最新报告名称：${projectReports[0].baseName}。详细结论请查看对应报告内容。`
        : "当前项目尚未生成报告，请先执行模块解读或阶段审查。";
      judgability = projectReports.length > 0 ? "可判断" : "资料不足";
    } else {
      answer = `基于当前项目 ${projectMaterials.length} 个资料对象和 ${projectInterpretations.length} 条解读记录，AI 无法直接回答"${input.question.slice(0, 50)}"，需要结构工程师结合具体资料判断。`;
      judgability = "资料不足";
    }
  } else {
    const allArchived = [...projects.values()].filter((project) => !project.deletedAt);
    const allInterpretations = [...interpretations.values()];
    const allMaterials = [...materials.values()].filter((material) => !material.deletedAt && !material.permanentlyDeletedAt);

    evidenceSources.push(...allArchived.slice(0, 3).map((project): AiQaEvidenceSource => ({
      type: "project", id: project.id, label: project.name, timestamp: project.createdAt,
    })));

    if (allArchived.length === 0) {
      answer = "资料库中尚无已归档项目，无法基于历史案例回答。请先完成至少一个项目并归档。";
      judgability = "资料不足";
    } else if (q.includes("dfm") || q.includes("制造")) {
      const dfmInterpretations = allInterpretations.filter((interp) => interp.moduleCode.includes("dfm") || interp.moduleName.includes("DFM"));
      answer = dfmInterpretations.length > 0
        ? `资料库中共有 ${dfmInterpretations.length} 条 DFM 相关解读记录，来自 ${allArchived.length} 个项目。常见 DFM 风险包括：${dfmInterpretations.flatMap((interp) => interp.risks).slice(0, 4).join("、")}。`
        : `资料库中共有 ${allArchived.length} 个项目、${allMaterials.length} 个资料对象，但尚无 DFM 专项解读记录。`;
      judgability = dfmInterpretations.length > 0 ? "部分可判断" : "资料不足";
    } else if (q.includes("eco") || q.includes("变更")) {
      const ecoInterpretations = allInterpretations.filter((interp) => interp.folderCode.includes("ECN") || interp.moduleName.includes("ECO"));
      answer = ecoInterpretations.length > 0
        ? `资料库中共有 ${ecoInterpretations.length} 条 ECO/ECN 解读记录。常见 ECO 风险：${ecoInterpretations.flatMap((interp) => interp.risks).slice(0, 4).join("、")}。`
        : `资料库中尚无 ECO/ECN 专项解读，无法形成历史经验总结。`;
      judgability = ecoInterpretations.length > 0 ? "部分可判断" : "资料不足";
    } else {
      answer = `资料库中共有 ${allArchived.length} 个归档项目、${allMaterials.length} 个资料对象。AI 无法直接回答"${input.question.slice(0, 50)}"，请提供更具体的关键词（如：DFM、ECO、测试失败、可靠性）以便检索相关历史案例。`;
      judgability = "资料不足";
    }
  }

  const permissionScope = input.scope === "project" && input.projectId
    ? `仅基于项目 ${input.projectId} 的资料回答`
    : "基于已归档资料库回答";

  return {
    id: createId("qa"),
    scope: input.scope,
    projectId: input.projectId,
    question: input.question,
    answer,
    evidenceSources,
    judgability,
    permissionScope,
    createdAt: now,
  };
}

export type RelationNode = {
  id: string;
  type: "bom" | "part" | "drawing2d" | "drawing3d" | "eco" | "testIssue" | "troubleList" | "module" | "material";
  label: string;
  materialId?: string;
  moduleCode?: string;
  status?: string;
};

export type RelationEdge = { from: string; to: string; label?: string };

export type RelationGraph = { nodes: RelationNode[]; edges: RelationEdge[] };

/**
 * 关联关系视图：BOM -> 零件 -> 2D图纸 -> 3D图纸 -> ECO -> 测试问题 -> Trouble list
 */
function buildRelationGraphLogic(
  projectId: string,
  folderCode: string,
  folderMaterials: MaterialObjectRecord[],
  folderInterpretations: ModuleInterpretationRecord[],
): RelationGraph {
  const nodes: RelationNode[] = [];
  const edges: RelationEdge[] = [];

  const bomFiles = folderMaterials.filter((material) => /BOM|Part.?list/i.test(material.name));
  const drawing2dFiles = folderMaterials.filter((material) => /2D|dwg|dxf/i.test(material.name));
  const drawing3dFiles = folderMaterials.filter((material) => /3D|stp|step|sldprt/i.test(material.name));
  const ecoFiles = folderMaterials.filter((material) => /ECO|ECN|变更/i.test(material.name));
  const testFiles = folderMaterials.filter((material) => /测试|跌落|振动|寿命|Test/i.test(material.name));
  const troubleFiles = folderMaterials.filter((material) => /Trouble|问题清单|缺陷|fail/i.test(material.name));

  // BOM 节点
  for (const bom of bomFiles) {
    const bomNodeId = `bom_${bom.id}`;
    nodes.push({ id: bomNodeId, type: "bom", label: bom.name, materialId: bom.id });

    // BOM -> 2D图纸
    for (const d2 of drawing2dFiles) {
      const d2NodeId = `drawing2d_${d2.id}`;
      if (!nodes.find((n) => n.id === d2NodeId)) {
        nodes.push({ id: d2NodeId, type: "drawing2d", label: d2.name, materialId: d2.id });
      }
      edges.push({ from: bomNodeId, to: d2NodeId, label: "2D图纸" });

      // 2D图纸 -> 3D图纸
      for (const d3 of drawing3dFiles) {
        const d3NodeId = `drawing3d_${d3.id}`;
        if (!nodes.find((n) => n.id === d3NodeId)) {
          nodes.push({ id: d3NodeId, type: "drawing3d", label: d3.name, materialId: d3.id });
        }
        if (!edges.find((e) => e.from === d2NodeId && e.to === d3NodeId)) {
          edges.push({ from: d2NodeId, to: d3NodeId, label: "对应3D" });
        }
      }
    }
  }

  // 3D图纸 -> ECO
  for (const d3 of drawing3dFiles) {
    const d3NodeId = `drawing3d_${d3.id}`;
    for (const eco of ecoFiles) {
      const ecoNodeId = `eco_${eco.id}`;
      if (!nodes.find((n) => n.id === ecoNodeId)) {
        nodes.push({ id: ecoNodeId, type: "eco", label: eco.name, materialId: eco.id });
      }
      edges.push({ from: d3NodeId, to: ecoNodeId, label: "ECO变更" });
    }
  }

  // ECO -> 测试问题
  for (const eco of ecoFiles) {
    const ecoNodeId = `eco_${eco.id}`;
    for (const test of testFiles) {
      const testNodeId = `test_${test.id}`;
      if (!nodes.find((n) => n.id === testNodeId)) {
        nodes.push({ id: testNodeId, type: "testIssue", label: test.name, materialId: test.id });
      }
      edges.push({ from: ecoNodeId, to: testNodeId, label: "验证测试" });
    }
  }

  // 测试问题 -> Trouble list
  for (const test of testFiles) {
    const testNodeId = `test_${test.id}`;
    for (const trouble of troubleFiles) {
      const troubleNodeId = `trouble_${trouble.id}`;
      if (!nodes.find((n) => n.id === troubleNodeId)) {
        nodes.push({ id: troubleNodeId, type: "troubleList", label: trouble.name, materialId: trouble.id });
      }
      edges.push({ from: testNodeId, to: troubleNodeId, label: "问题记录" });
    }
  }

  // 若某类文件存在但无关联，添加孤立节点
  for (const material of folderMaterials) {
    const allMaterialIds = nodes.filter((n) => n.materialId).map((n) => n.materialId);
    if (!allMaterialIds.includes(material.id)) {
      nodes.push({ id: `other_${material.id}`, type: "material", label: material.name, materialId: material.id });
    }
  }

  return { nodes, edges };
}
