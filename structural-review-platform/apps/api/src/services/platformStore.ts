import { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../db/prisma";
import { parseArray, parseObject, toJson } from "../db/json";
import {
  buildDefaultProjectFolders,
  describeMaterialDeletion,
  describeProjectSoftDelete,
  type MaterialObjectInput,
} from "../domain/projectLifecycle";
import {
  buildFolderReportBaseName,
} from "../domain/projectLifecycle";
import {
  buildModuleReportBaseName,
  getModulesByFolder,
  reviewModules,
  type MaterialDeleteAction,
  type EvidenceTrace,
} from "../../../../packages/review-core/src/projectStructure";
import type {
  AiQaRecord,
  BomDrawingCheckResult,
  CrossModuleConflictRecord,
  MaterialObjectRecord,
  MaterialVersionRecord,
  ModuleInterpretationRecord,
  ProjectFolderRecord,
  ProjectRecord,
  RelationGraph,
  ReviewJobRecord,
  ReviewModuleRecord,
  ReviewReportRecord,
  AuditLogRecord,
} from "./types";
import {
  buildEvidenceChain,
  buildDeepRisks,
  buildMissingHints,
  buildModuleMarkdown,
  buildReviewMarkdown,
  buildRuleBasedAiQa,
  buildSuggestedActions,
  checkCrossModuleConflictsLogic,
  createId,
  evaluateAdmission,
  getModuleStatus,
  inferMaterialVersion,
  incrementVersionTag,
  normalizeModuleCodes,
  runBomDrawingCheckLogic,
  buildRelationGraphLogic,
} from "./reviewLogic";
import { parseBomPartNames } from "./documentParse";
import { deleteStoredFile } from "./storage";
import { callLlm, llmConfigured } from "./llm";
import type { FolderStatus } from "../../../../packages/review-core/src/projectStructure";

type MaterialRow = Prisma.MaterialObjectGetPayload<{ include: { versions: true } }>;

function iso(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}

function mapProject(row: {
  id: string; name: string; productCode: string | null; description: string | null;
  deletedAt: Date | null; createdAt: Date; updatedAt: Date;
}): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    productCode: row.productCode ?? undefined,
    description: row.description ?? undefined,
    deletedAt: iso(row.deletedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMaterial(row: MaterialRow): MaterialObjectRecord {
  const versions = [...row.versions].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  return {
    id: row.id,
    projectId: row.projectId,
    folderCode: row.folderCode,
    moduleCodes: parseArray<string>(row.moduleCodes),
    type: row.type as MaterialObjectRecord["type"],
    name: row.name,
    originalName: row.originalName ?? undefined,
    storagePath: row.storagePath ?? undefined,
    sizeBytes: row.sizeBytes ?? undefined,
    mimeType: row.mimeType ?? undefined,
    deletedAt: iso(row.deletedAt),
    permanentlyDeletedAt: iso(row.permanentlyDeletedAt),
    createdAt: row.createdAt.toISOString(),
    effectiveVersion: row.effectiveVersion ?? undefined,
    versionIds: versions.map((v) => v.id),
    activeVersionId: row.activeVersionId ?? undefined,
    metadata: row.metadata ?? undefined,
  };
}

function mapVersion(row: {
  id: string; materialId: string; projectId: string; versionTag: string; name: string;
  storagePath: string | null; sizeBytes: number | null; mimeType: string | null;
  uploadedAt: Date; uploadedBy: string | null; note: string | null;
}): MaterialVersionRecord {
  return {
    id: row.id,
    materialId: row.materialId,
    projectId: row.projectId,
    versionTag: row.versionTag,
    name: row.name,
    storagePath: row.storagePath ?? undefined,
    sizeBytes: row.sizeBytes ?? undefined,
    mimeType: row.mimeType ?? undefined,
    uploadedAt: row.uploadedAt.toISOString(),
    uploadedBy: row.uploadedBy ?? undefined,
    note: row.note ?? undefined,
  };
}

function mapInterpretation(row: Prisma.ModuleInterpretationGetPayload<object>): ModuleInterpretationRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    folderCode: row.folderCode,
    moduleCode: row.moduleCode,
    moduleName: row.moduleName,
    status: row.status as ModuleInterpretationRecord["status"],
    materialStatus: row.materialStatus,
    recognizedMaterials: parseArray<string>(row.recognizedMaterials),
    coreSummary: row.coreSummary,
    sourceType: row.sourceType as ModuleInterpretationRecord["sourceType"],
    structuralJudgment: row.structuralJudgment,
    risks: parseArray<string>(row.risks),
    missingItems: parseArray<string>(row.missingItems),
    evidenceChain: parseArray<EvidenceTrace>(row.evidenceChain),
    admissionResult: parseObject(row.admissionResult, { passed: false, missingConditions: [], conclusion: "" }),
    confirmationQuestions: parseArray<string>(row.confirmationQuestions),
    suggestedActions: parseArray<string>(row.suggestedActions),
    confidence: row.confidence as ModuleInterpretationRecord["confidence"],
    blocksStage: row.blocksStage,
    createdAt: row.createdAt.toISOString(),
    confirmedAt: iso(row.confirmedAt),
  };
}

function mapReport(row: Prisma.ReviewReportGetPayload<object>): ReviewReportRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    folderCode: row.folderCode ?? undefined,
    moduleCode: row.moduleCode ?? undefined,
    reviewJobId: row.reviewJobId,
    baseName: row.baseName,
    title: row.title,
    markdownContent: row.markdownContent,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapBomCheck(row: Prisma.BomCheckResultGetPayload<object>): BomDrawingCheckResult {
  return {
    id: row.id,
    projectId: row.projectId,
    folderCode: row.folderCode,
    checkedPrefix: row.checkedPrefix,
    bomOnlyItems: parseArray<string>(row.bomOnlyItems),
    drawingOnlyItems: parseArray<string>(row.drawingOnlyItems),
    fuzzyMatches: parseArray<BomDrawingCheckResult["fuzzyMatches"][number]>(row.fuzzyMatches),
    versionConflicts: parseArray<BomDrawingCheckResult["versionConflicts"][number]>(row.versionConflicts),
    tripleGaps: parseArray<string>(row.tripleGaps),
    namingIssues: parseArray<string>(row.namingIssues),
    suggestions: parseArray<string>(row.suggestions),
    usedSheet: row.usedSheet,
    sheetIsAutoDetected: row.sheetIsAutoDetected,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAiQa(row: Prisma.AiQaGetPayload<object>): AiQaRecord {
  return {
    id: row.id,
    scope: row.scope as AiQaRecord["scope"],
    projectId: row.projectId ?? undefined,
    question: row.question,
    answer: row.answer,
    evidenceSources: parseArray<AiQaRecord["evidenceSources"][number]>(row.evidenceSources),
    judgability: row.judgability as AiQaRecord["judgability"],
    permissionScope: row.permissionScope,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAudit(row: Prisma.AuditLogGetPayload<object>): AuditLogRecord {
  return {
    id: row.id,
    projectId: row.projectId ?? undefined,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId ?? undefined,
    message: row.message ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

async function writeAudit(
  projectId: string | undefined,
  action: string,
  targetType: string,
  targetId?: string,
  message?: string,
  actorId?: string,
): Promise<void> {
  await prisma.auditLog.create({
    data: { projectId: projectId ?? null, action, targetType, targetId: targetId ?? null, message: message ?? null, actorId: actorId ?? null },
  });
}

async function requireProject(projectId: string): Promise<ProjectRecord> {
  const row = await prisma.project.findUnique({ where: { id: projectId } });
  if (!row) throw new Error("项目不存在");
  return mapProject(row);
}

async function getMaterialRow(materialId: string): Promise<MaterialRow> {
  const row = await prisma.materialObject.findUnique({ where: { id: materialId }, include: { versions: true } });
  if (!row) throw new Error("资料对象不存在");
  return row;
}

async function updateFolderStats(projectId: string, folderCode: string): Promise<void> {
  const activeCount = await prisma.materialObject.count({
    where: { projectId, folderCode, deletedAt: null, permanentlyDeletedAt: null },
  });
  await prisma.projectFolder.updateMany({
    where: { projectId, code: folderCode },
    data: { status: activeCount > 0 ? "已上传" : "未上传" },
  });
}

async function folderMaterialCounts(projectId: string): Promise<Map<string, number>> {
  const grouped = await prisma.materialObject.groupBy({
    by: ["folderCode"],
    where: { projectId, deletedAt: null, permanentlyDeletedAt: null },
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.folderCode, g._count._all]));
}

export const platformStore = {
  async listProjects(includeDeleted = false): Promise<ProjectRecord[]> {
    const rows = await prisma.project.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapProject);
  },

  async createProject(input: { name: string; productCode?: string; description?: string }): Promise<ProjectRecord> {
    if (!input.name) throw new Error("项目名称不能为空");
    const project = await prisma.project.create({
      data: {
        name: input.name,
        productCode: input.productCode ?? null,
        description: input.description ?? null,
        folders: {
          create: buildDefaultProjectFolders().map((folder) => ({
            code: folder.code,
            name: folder.name,
            description: folder.description,
            status: folder.status,
            sortOrder: folder.sortOrder,
          })),
        },
      },
    });
    await writeAudit(project.id, "project.create", "Project", project.id, `创建项目 ${project.name}`);
    return mapProject(project);
  },

  async getProject(projectId: string): Promise<ProjectRecord | undefined> {
    const row = await prisma.project.findUnique({ where: { id: projectId } });
    return row ? mapProject(row) : undefined;
  },

  async updateProject(projectId: string, input: { name?: string; productCode?: string; description?: string }): Promise<ProjectRecord> {
    await requireProject(projectId);
    const row = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.productCode !== undefined ? { productCode: input.productCode } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
    await writeAudit(projectId, "project.update", "Project", projectId, `更新项目 ${row.name}`);
    return mapProject(row);
  },

  async softDeleteProject(projectId: string): Promise<ProjectRecord> {
    await requireProject(projectId);
    const deletion = describeProjectSoftDelete(projectId);
    const row = await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: deletion.deletedAt },
    });
    await writeAudit(projectId, deletion.auditAction, "Project", projectId, `软删除项目，保留 ${deletion.keeps.join("、")}`);
    return mapProject(row);
  },

  async restoreProject(projectId: string): Promise<ProjectRecord> {
    await requireProject(projectId);
    const row = await prisma.project.update({ where: { id: projectId }, data: { deletedAt: null } });
    await writeAudit(projectId, "project.restore", "Project", projectId, "恢复软删除项目");
    return mapProject(row);
  },

  async listFolders(projectId: string): Promise<ProjectFolderRecord[]> {
    await requireProject(projectId);
    const [rows, counts] = await Promise.all([
      prisma.projectFolder.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } }),
      folderMaterialCounts(projectId),
    ]);
    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.status as FolderStatus,
      sortOrder: row.sortOrder,
      materialCount: counts.get(row.code) ?? 0,
      reportCount: row.reportCount,
    }));
  },

  async getFolder(projectId: string, folderCode: string): Promise<ProjectFolderRecord | undefined> {
    const folders = await this.listFolders(projectId);
    return folders.find((folder) => folder.code === folderCode);
  },

  async listMaterials(projectId: string, folderCode?: string, includeDeleted = false): Promise<MaterialObjectRecord[]> {
    const rows = await prisma.materialObject.findMany({
      where: {
        projectId,
        ...(folderCode ? { folderCode } : {}),
        ...(includeDeleted ? {} : { deletedAt: null, permanentlyDeletedAt: null }),
      },
      include: { versions: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapMaterial);
  },

  async listModules(projectId: string, folderCode: string): Promise<ReviewModuleRecord[]> {
    await requireProject(projectId);
    const [materials, interpretations, reports] = await Promise.all([
      this.listMaterials(projectId, folderCode),
      this.listModuleInterpretations(projectId, folderCode),
      this.listReports(projectId, folderCode),
    ]);
    return getModulesByFolder(folderCode).map((moduleConfig) => {
      const moduleMaterials = materials.filter((material) => material.moduleCodes.includes(moduleConfig.code));
      const moduleInterpretations = interpretations.filter((interp) => interp.moduleCode === moduleConfig.code);
      const moduleReports = reports.filter((report) => report.moduleCode === moduleConfig.code);
      return {
        ...moduleConfig,
        status: getModuleStatus(moduleConfig, moduleMaterials, moduleInterpretations),
        materialCount: moduleMaterials.length,
        interpretationCount: moduleInterpretations.length,
        reportCount: moduleReports.length,
      };
    });
  },

  async addMaterial(projectId: string, input: MaterialObjectInput, actorId?: string): Promise<MaterialObjectRecord> {
    const folder = await this.getFolder(projectId, input.folderCode);
    if (!folder) throw new Error("分类目录不存在");
    const versionTag = inferMaterialVersion(input.name) || "V1";
    const moduleCodes = normalizeModuleCodes(input.folderCode, input.moduleCodes);

    const material = await prisma.materialObject.create({
      data: {
        projectId,
        folderCode: input.folderCode,
        moduleCodes: toJson(moduleCodes),
        type: input.type,
        name: input.name,
        originalName: input.name,
        storagePath: input.storagePath ?? null,
        sizeBytes: input.sizeBytes ?? null,
        mimeType: input.mimeType ?? null,
        effectiveVersion: versionTag,
      },
    });
    const version = await prisma.materialVersion.create({
      data: {
        materialId: material.id,
        projectId,
        versionTag,
        name: input.name,
        storagePath: input.storagePath ?? null,
        sizeBytes: input.sizeBytes ?? null,
        mimeType: input.mimeType ?? null,
        note: "初始版本",
        uploadedBy: actorId ?? null,
      },
    });
    await prisma.materialObject.update({ where: { id: material.id }, data: { activeVersionId: version.id } });
    await updateFolderStats(projectId, input.folderCode);
    await writeAudit(projectId, "material.upload", "MaterialObject", material.id, `上传资料对象 ${input.name}（${versionTag}）`, actorId);
    return mapMaterial(await getMaterialRow(material.id));
  },

  async unlinkMaterialFromModule(materialId: string, moduleCode: string, actorId?: string): Promise<MaterialObjectRecord> {
    const row = await getMaterialRow(materialId);
    const moduleCodes = parseArray<string>(row.moduleCodes).filter((code) => code !== moduleCode);
    await prisma.materialObject.update({ where: { id: materialId }, data: { moduleCodes: toJson(moduleCodes) } });
    await writeAudit(row.projectId, "material.unlink_module", "MaterialObject", materialId, `资料对象取消关联模块 ${moduleCode}`, actorId);
    return mapMaterial(await getMaterialRow(materialId));
  },

  async deleteMaterial(materialId: string, action: MaterialDeleteAction, actorId?: string) {
    const row = await getMaterialRow(materialId);
    const material = mapMaterial(row);
    const deletion = describeMaterialDeletion(action);

    if (action === "从本次审查移除") {
      await writeAudit(material.projectId, "material.remove_from_review", "MaterialObject", materialId, "从本次审查移除资料对象", actorId);
      return { material, deletion };
    }

    if (action === "彻底删除") {
      // 永久删除：同时删除磁盘上的所有版本文件，避免存储泄漏与数据残留。
      await deleteStoredFile(row.storagePath);
      await Promise.all(row.versions.map((v) => deleteStoredFile(v.storagePath)));
      const updated = await prisma.materialObject.update({
        where: { id: materialId },
        data: { permanentlyDeletedAt: new Date() },
        include: { versions: true },
      });
      await updateFolderStats(material.projectId, material.folderCode);
      await writeAudit(material.projectId, "material.permanent_delete", "MaterialObject", materialId, action, actorId);
      return { material: mapMaterial(updated), deletion };
    }

    // 从分类文件夹删除 = 软删除到回收站。
    const updated = await prisma.materialObject.update({
      where: { id: materialId },
      data: { deletedAt: new Date() },
      include: { versions: true },
    });
    await updateFolderStats(material.projectId, material.folderCode);
    await writeAudit(material.projectId, "material.soft_delete", "MaterialObject", materialId, action, actorId);
    return { material: mapMaterial(updated), deletion };
  },

  async restoreMaterial(materialId: string, actorId?: string): Promise<MaterialObjectRecord> {
    const row = await getMaterialRow(materialId);
    const updated = await prisma.materialObject.update({
      where: { id: materialId },
      data: { deletedAt: null },
      include: { versions: true },
    });
    await updateFolderStats(row.projectId, row.folderCode);
    await writeAudit(row.projectId, "material.restore", "MaterialObject", materialId, "从回收站恢复资料对象", actorId);
    return mapMaterial(updated);
  },

  async listRecycleBin(): Promise<MaterialObjectRecord[]> {
    const rows = await prisma.materialObject.findMany({
      where: { deletedAt: { not: null }, permanentlyDeletedAt: null },
      include: { versions: true },
      orderBy: { deletedAt: "desc" },
    });
    return rows.map(mapMaterial);
  },

  async createReview(projectId: string, folderCode: string | undefined, reviewType: string, actorId?: string): Promise<ReviewJobRecord> {
    const project = await requireProject(projectId);
    const folder = folderCode ? await this.getFolder(projectId, folderCode) : undefined;
    if (folderCode && !folder) throw new Error("分类目录不存在");
    const now = new Date();
    const reportBaseName = buildFolderReportBaseName({
      projectName: project.name,
      folderName: folder?.name ?? "全项目",
      reviewType,
      date: now.toISOString().slice(0, 10).replace(/-/g, ""),
    });
    const job = await prisma.reviewJob.create({
      data: { projectId, folderCode: folderCode ?? null, reviewType, status: "succeeded", reportBaseName },
    });
    const jobRecord: ReviewJobRecord = {
      id: job.id,
      projectId,
      folderCode: folderCode ?? undefined,
      reviewType,
      status: "succeeded",
      reportBaseName,
      createdAt: job.createdAt.toISOString(),
    };
    const [moduleRows, materials, conflicts] = await Promise.all([
      this.listModules(projectId, folderCode ?? ""),
      this.listMaterials(projectId, folderCode),
      folderCode ? this.checkCrossModuleConflicts(projectId, folderCode) : Promise.resolve([]),
    ]);
    const report = await prisma.reviewReport.create({
      data: {
        projectId,
        folderCode: folderCode ?? null,
        reviewJobId: job.id,
        baseName: reportBaseName,
        title: `${folder?.name ?? "全项目"} ${reviewType}报告`,
        markdownContent: buildReviewMarkdown(project, folder, jobRecord, materials, moduleRows, conflicts),
      },
    });
    void report;
    if (folderCode) {
      await prisma.projectFolder.updateMany({
        where: { projectId, code: folderCode },
        data: { status: "已出报告", reportCount: { increment: 1 } },
      });
    }
    await writeAudit(projectId, "review.create", "ReviewJob", job.id, `创建审查任务 ${reportBaseName}`, actorId);
    return jobRecord;
  },

  async listReports(projectId: string, folderCode?: string): Promise<ReviewReportRecord[]> {
    const rows = await prisma.reviewReport.findMany({
      where: { projectId, ...(folderCode ? { folderCode } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapReport);
  },

  async createModuleInterpretation(projectId: string, folderCode: string, moduleCode: string, reviewType = "模块深度解读", actorId?: string) {
    const project = await requireProject(projectId);
    const folder = await this.getFolder(projectId, folderCode);
    if (!folder) throw new Error("分类目录不存在");
    const moduleConfig = reviewModules.find((item) => item.folderCode === folderCode && item.code === moduleCode);
    if (!moduleConfig) throw new Error("模块不存在");

    const materials = await this.listMaterials(projectId, folderCode);
    const moduleMaterials = materials.filter((material) => material.moduleCodes.includes(moduleCode));
    const evidenceChain = buildEvidenceChain(projectId, folderCode, moduleCode, moduleMaterials, "明确陈述");
    const admissionResult = evaluateAdmission(moduleConfig, moduleMaterials);
    const missingItems = admissionResult.passed ? [] : admissionResult.missingConditions;
    const risks = buildDeepRisks(moduleConfig, moduleMaterials, admissionResult);
    const hasMaterials = moduleMaterials.length > 0;

    const row = await prisma.moduleInterpretation.create({
      data: {
        projectId,
        folderCode,
        moduleCode,
        moduleName: moduleConfig.name,
        status: hasMaterials ? "已解读" : "需补充/有风险",
        materialStatus: hasMaterials ? "已上传" : "未上传",
        sourceType: hasMaterials ? "明确陈述" : "未知",
        coreSummary: hasMaterials
          ? `已识别 ${moduleMaterials.length} 个资料对象，当前模块可形成初步工程判断。`
          : "当前模块尚未识别到资料对象，只能输出缺失项和补充建议。",
        structuralJudgment: hasMaterials
          ? `${moduleConfig.name}已有资料输入，可进入阶段级审查；仍需人工确认关键结论。`
          : `${moduleConfig.name}资料不足，暂不能作为可靠结构设计输入。`,
        confidence: admissionResult.passed ? "中" : hasMaterials ? "低" : "未知",
        blocksStage: moduleConfig.affectsStageGate && !admissionResult.passed,
        recognizedMaterials: toJson(moduleMaterials.map((material) => material.name)),
        risks: toJson(risks),
        missingItems: toJson(missingItems),
        evidenceChain: toJson(evidenceChain),
        admissionResult: toJson(admissionResult),
        confirmationQuestions: toJson(moduleConfig.affectsStageGate
          ? [`请确认 ${moduleConfig.name} 是否满足当前阶段准入条件。`]
          : [`请确认 ${moduleConfig.name} 是否适用于本项目。`]),
        suggestedActions: toJson(buildSuggestedActions(moduleConfig, missingItems)),
      },
    });
    const interpretation = mapInterpretation(row);

    const reportBaseName = buildModuleReportBaseName({
      projectName: project.name,
      folderName: folder.name,
      moduleName: moduleConfig.name,
      reviewType,
      timestamp: row.createdAt.toISOString().slice(0, 16).replace(/[-:T]/g, "_"),
    });
    const reportRow = await prisma.reviewReport.create({
      data: {
        projectId,
        folderCode,
        moduleCode,
        reviewJobId: interpretation.id,
        baseName: reportBaseName,
        title: `${moduleConfig.name}${reviewType}`,
        markdownContent: buildModuleMarkdown(project, folder, interpretation),
      },
    });
    await writeAudit(projectId, "module.interpret", "ReviewModule", moduleCode, `生成模块解读 ${reportBaseName}`, actorId);
    return { interpretation, report: mapReport(reportRow) };
  },

  async confirmModuleInterpretation(projectId: string, folderCode: string, moduleCode: string, actorId?: string): Promise<ModuleInterpretationRecord> {
    const latest = (await this.listModuleInterpretations(projectId, folderCode, moduleCode))[0];
    if (!latest) throw new Error("模块尚未解读，不能人工确认");
    const row = await prisma.moduleInterpretation.update({
      where: { id: latest.id },
      data: { status: "人工已确认", confirmedAt: new Date(), blocksStage: false },
    });
    await writeAudit(projectId, "module.confirm", "ReviewModule", moduleCode, "人工确认模块解读结果", actorId);
    return mapInterpretation(row);
  },

  async listModuleInterpretations(projectId: string, folderCode: string, moduleCode?: string): Promise<ModuleInterpretationRecord[]> {
    const rows = await prisma.moduleInterpretation.findMany({
      where: { projectId, folderCode, ...(moduleCode ? { moduleCode } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapInterpretation);
  },

  async checkCrossModuleConflicts(projectId: string, folderCode: string): Promise<CrossModuleConflictRecord[]> {
    const folderMaterials = await this.listMaterials(projectId, folderCode);
    return checkCrossModuleConflictsLogic(projectId, folderCode, folderMaterials);
  },

  async getMissingHints(projectId: string, folderCode: string): Promise<string[]> {
    const folder = await this.getFolder(projectId, folderCode);
    if (!folder) throw new Error("分类目录不存在");
    const [activeMaterials, moduleRows] = await Promise.all([
      this.listMaterials(projectId, folderCode),
      this.listModules(projectId, folderCode),
    ]);
    // 纯读取，不再产生写副作用。
    return buildMissingHints(folder, activeMaterials, moduleRows);
  },

  async listAuditLogs(projectId?: string): Promise<AuditLogRecord[]> {
    const rows = await prisma.auditLog.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return rows.map(mapAudit);
  },

  async getMaterialDetail(materialId: string, actorId?: string) {
    const row = await getMaterialRow(materialId);
    const material = mapMaterial(row);
    await writeAudit(material.projectId, "material.view", "MaterialObject", materialId, `查看资料对象 ${material.name}`, actorId);
    const versions = [...row.versions]
      .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime())
      .map(mapVersion);
    const [reportRows, auditRows] = await Promise.all([
      prisma.reviewReport.findMany({
        where: {
          projectId: material.projectId,
          folderCode: material.folderCode,
          moduleCode: { in: material.moduleCodes.length > 0 ? material.moduleCodes : ["__none__"] },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({ where: { targetId: materialId }, orderBy: { createdAt: "desc" } }),
    ]);
    return { material, versions, reports: reportRows.map(mapReport), auditLogs: auditRows.map(mapAudit) };
  },

  async addMaterialVersion(materialId: string, input: {
    name: string; storagePath?: string; sizeBytes?: number; mimeType?: string; versionTag?: string; note?: string;
  }, actorId?: string) {
    const row = await getMaterialRow(materialId);
    const newTag = input.versionTag ?? incrementVersionTag(row.effectiveVersion ?? "V1");
    const version = await prisma.materialVersion.create({
      data: {
        materialId,
        projectId: row.projectId,
        versionTag: newTag,
        name: input.name,
        storagePath: input.storagePath ?? null,
        sizeBytes: input.sizeBytes ?? null,
        mimeType: input.mimeType ?? null,
        note: input.note ?? "新版本",
        uploadedBy: actorId ?? null,
      },
    });
    await prisma.materialObject.update({
      where: { id: materialId },
      data: {
        name: input.name,
        storagePath: input.storagePath ?? null,
        sizeBytes: input.sizeBytes ?? null,
        mimeType: input.mimeType ?? null,
        effectiveVersion: newTag,
        activeVersionId: version.id,
      },
    });
    await writeAudit(row.projectId, "material.replace_version", "MaterialObject", materialId, `上传新版本 ${newTag}：${input.name}`, actorId);
    return { material: mapMaterial(await getMaterialRow(materialId)), version: mapVersion(version) };
  },

  async setMaterialEffectiveVersion(materialId: string, versionId: string, actorId?: string) {
    const row = await getMaterialRow(materialId);
    const version = row.versions.find((v) => v.id === versionId);
    if (!version) throw new Error("版本不存在或不属于该资料对象");
    await prisma.materialObject.update({
      where: { id: materialId },
      data: {
        name: version.name,
        storagePath: version.storagePath,
        sizeBytes: version.sizeBytes,
        mimeType: version.mimeType,
        effectiveVersion: version.versionTag,
        activeVersionId: versionId,
      },
    });
    await writeAudit(row.projectId, "material.set_effective_version", "MaterialObject", materialId, `设置有效版本为 ${version.versionTag}`, actorId);
    return { material: mapMaterial(await getMaterialRow(materialId)), version: mapVersion(version) };
  },

  async updateMaterialMetadata(materialId: string, input: { metadata?: string; name?: string }, actorId?: string): Promise<MaterialObjectRecord> {
    const row = await getMaterialRow(materialId);
    await prisma.materialObject.update({
      where: { id: materialId },
      data: {
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
      },
    });
    await writeAudit(row.projectId, "material.modify_metadata", "MaterialObject", materialId, `修改元数据: ${JSON.stringify(input)}`, actorId);
    return mapMaterial(await getMaterialRow(materialId));
  },

  async listMaterialVersions(materialId: string): Promise<MaterialVersionRecord[]> {
    const row = await getMaterialRow(materialId);
    return [...row.versions].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime()).map(mapVersion);
  },

  /** 供下载端点使用：返回资料/指定版本的服务器存储路径与展示名。 */
  async getDownloadTarget(materialId: string, versionId?: string): Promise<{ storagePath?: string; name: string; mimeType?: string } | null> {
    const row = await getMaterialRow(materialId).catch(() => null);
    if (!row) return null;
    if (versionId) {
      const version = row.versions.find((v) => v.id === versionId);
      if (!version) return null;
      return { storagePath: version.storagePath ?? undefined, name: version.name, mimeType: version.mimeType ?? undefined };
    }
    return { storagePath: row.storagePath ?? undefined, name: row.name, mimeType: row.mimeType ?? undefined };
  },

  async runBomDrawingCheck(projectId: string, folderCode: string, actorId?: string): Promise<BomDrawingCheckResult> {
    const folderMaterials = await this.listMaterials(projectId, folderCode);
    // 尝试真实解析首个 BOM Excel 文件内容。
    const bomFile = folderMaterials.find((material) =>
      /BOM|Part.?list|料单|物料/i.test(material.name) && /\.(xlsx|xls)$/i.test(material.name) && material.storagePath,
    );
    const parsedBom = bomFile?.storagePath ? await parseBomPartNames(bomFile.storagePath) : null;
    const result = runBomDrawingCheckLogic(projectId, folderCode, folderMaterials, parsedBom);
    const row = await prisma.bomCheckResult.create({
      data: {
        id: result.id,
        projectId,
        folderCode,
        checkedPrefix: result.checkedPrefix,
        usedSheet: result.usedSheet,
        sheetIsAutoDetected: result.sheetIsAutoDetected,
        bomOnlyItems: toJson(result.bomOnlyItems),
        drawingOnlyItems: toJson(result.drawingOnlyItems),
        fuzzyMatches: toJson(result.fuzzyMatches),
        versionConflicts: toJson(result.versionConflicts),
        tripleGaps: toJson(result.tripleGaps),
        namingIssues: toJson(result.namingIssues),
        suggestions: toJson(result.suggestions),
      },
    });
    await writeAudit(projectId, "module.interpret", "BomCheck", row.id, `BOM/图纸专项检查: ${result.checkedPrefix}`, actorId);
    return mapBomCheck(row);
  },

  async listBomCheckResults(projectId: string, folderCode: string): Promise<BomDrawingCheckResult[]> {
    const rows = await prisma.bomCheckResult.findMany({
      where: { projectId, folderCode },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapBomCheck);
  },

  async buildRelationGraph(projectId: string, folderCode: string): Promise<RelationGraph> {
    const folderMaterials = await this.listMaterials(projectId, folderCode);
    return buildRelationGraphLogic(projectId, folderCode, folderMaterials);
  },

  async createAiQa(input: { scope: "project" | "global"; projectId?: string; question: string; actorId?: string }): Promise<AiQaRecord> {
    if (!input.question.trim()) throw new Error("问题不能为空");

    // 聚合作答所需数据。
    const [projectMaterials, projectInterpretations, projectReports] = input.projectId
      ? await Promise.all([
          this.listMaterials(input.projectId),
          prisma.moduleInterpretation.findMany({ where: { projectId: input.projectId } }).then((r) => r.map(mapInterpretation)),
          this.listReports(input.projectId),
        ])
      : [[], [], []];
    const [allProjectRows, allInterpRows, allMaterials] = await Promise.all([
      prisma.project.findMany({ where: { deletedAt: null } }),
      prisma.moduleInterpretation.findMany(),
      prisma.materialObject.findMany({ where: { deletedAt: null, permanentlyDeletedAt: null }, include: { versions: true } }),
    ]);

    const ruleBased = buildRuleBasedAiQa({
      scope: input.scope,
      projectId: input.projectId,
      question: input.question,
      projectMaterials,
      projectInterpretations,
      projectReports,
      allProjects: allProjectRows.map(mapProject),
      allInterpretations: allInterpRows.map(mapInterpretation),
      allMaterials: allMaterials.map(mapMaterial),
    });

    // 若已配置 LLM，尝试用真实模型改写答案；失败则保留规则版答案。
    let answer = ruleBased.answer;
    if (llmConfigured) {
      const llmAnswer = await callLlm([
        {
          role: "system",
          content: "你是结构项目评审助手。必须只基于提供的证据回答，注明信息来源与置信度，缺乏证据时明确说明需人工确认，不得编造 CAD/仿真/批准/闭环等结论。",
        },
        {
          role: "user",
          content: `问题：${input.question}\n\n可用证据摘要：\n${ruleBased.answer}\n\n请在不超出上述证据范围的前提下给出简洁回答。`,
        },
      ]);
      if (llmAnswer) answer = llmAnswer;
    }

    const permissionScope = input.scope === "project" && input.projectId
      ? `仅基于项目 ${input.projectId} 的资料回答`
      : "基于已归档资料库回答";

    const row = await prisma.aiQa.create({
      data: {
        scope: input.scope,
        projectId: input.projectId ?? null,
        question: input.question,
        answer,
        judgability: ruleBased.judgability,
        permissionScope,
        evidenceSources: toJson(ruleBased.evidenceSources),
      },
    });
    if (input.projectId) {
      await writeAudit(input.projectId, "ai_qa.reference", "AiQa", row.id, `AI问答: ${input.question.slice(0, 60)}`, input.actorId);
    }
    return mapAiQa(row);
  },

  async listAiQa(projectId?: string, scope?: "project" | "global"): Promise<AiQaRecord[]> {
    const rows = await prisma.aiQa.findMany({
      where: { ...(projectId ? { projectId } : {}), ...(scope ? { scope } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapAiQa);
  },
};
