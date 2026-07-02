import type { FolderStatus, MaterialDeleteAction, MaterialObjectType, ModuleStatus } from "../config/projectStructure";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";

export type Project = {
  id: string;
  name: string;
  productCode?: string;
  description?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFolder = {
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

/** 资料对象版本历史记录 */
export type MaterialVersion = {
  id: string;
  materialId: string;
  projectId: string;
  versionTag: string;
  name: string;
  storagePath?: string;
  sizeBytes?: number;
  mimeType?: string;
  uploadedAt: string;
  note?: string;
};

export type MaterialObject = {
  id: string;
  projectId: string;
  folderCode: string;
  moduleCodes: string[];
  type: MaterialObjectType;
  name: string;
  storagePath?: string;
  sizeBytes?: number;
  mimeType?: string;
  deletedAt?: string;
  permanentlyDeletedAt?: string;
  createdAt: string;
  /** 当前有效版本标签，如 RevA / V1.0 */
  effectiveVersion?: string;
  versionIds: string[];
  activeVersionId?: string;
  metadata?: string;
};

export type MaterialParseFeedback = {
  status: "parsed" | "needs_manual_review" | "unsupported" | "not_available";
  confidence: "高" | "中" | "低" | "未知";
  parser: string;
  summary: string;
  findings: string[];
  requiresManualConfirmation: boolean;
};

export type MaterialDetail = {
  material: MaterialObject;
  versions: MaterialVersion[];
  reports: ReviewReport[];
  auditLogs: AuditLog[];
  parseFeedback: MaterialParseFeedback;
};

export type EvidenceTrace = {
  projectId: string;
  folderCode: string;
  moduleCode: string;
  materialObjectId?: string;
  materialName?: string;
  materialVersion?: string;
  interpretationId?: string;
  sourceType: string;
  excerpt?: string;
};

export type ReviewModule = {
  code: string;
  folderCode: string;
  name: string;
  required: boolean;
  purpose: string;
  expectedContents: string[];
  commonRisks: string[];
  missingImpact: string;
  recommendedMaterials: string[];
  affectsStageGate: boolean;
  status: ModuleStatus;
  materialCount: number;
  interpretationCount: number;
  reportCount: number;
  minimumReviewConditions: string[];
  blockingRules: string[];
};

export type ModuleInterpretation = {
  id: string;
  projectId: string;
  folderCode: string;
  moduleCode: string;
  moduleName: string;
  status: ModuleStatus;
  materialStatus: string;
  recognizedMaterials: string[];
  coreSummary: string;
  sourceType: string;
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
  confidence: string;
  blocksStage: boolean;
  createdAt: string;
  confirmedAt?: string;
};

export type CrossModuleConflict = {
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

/** BOM/图纸专项对应检查结果 */
export type BomDrawingCheckResult = {
  id: string;
  projectId: string;
  folderCode: string;
  checkedPrefix: string;
  bomOnlyItems: string[];
  drawingOnlyItems: string[];
  fuzzyMatches: Array<{ drawing: string; bom: string; similarity: number }>;
  versionConflicts: Array<{ name: string; drawingVersion: string; bomVersion: string }>;
  tripleGaps: string[];
  namingIssues: string[];
  suggestions: string[];
  usedSheet: string;
  sheetIsAutoDetected: boolean;
  createdAt: string;
};

/** AI问答证据来源 */
export type AiQaEvidenceSource = {
  type: "project" | "folder" | "module" | "material" | "report" | "risk" | "interpretation";
  id: string;
  label: string;
  folderCode?: string;
  moduleCode?: string;
  timestamp?: string;
};

/** AI问答记录 */
export type AiQaRecord = {
  id: string;
  scope: "project" | "global";
  projectId?: string;
  question: string;
  answer: string;
  evidenceSources: AiQaEvidenceSource[];
  judgability: "可判断" | "部分可判断" | "资料不足";
  permissionScope: string;
  createdAt: string;
};

/** 审计日志记录 */
export type AuditLog = {
  id: string;
  projectId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  message?: string;
  createdAt: string;
};

/** 关联关系图节点 */
export type RelationNode = {
  id: string;
  type: "bom" | "part" | "drawing2d" | "drawing3d" | "eco" | "testIssue" | "troubleList" | "module" | "material";
  label: string;
  materialId?: string;
  moduleCode?: string;
  status?: string;
};

/** 关联关系图边 */
export type RelationEdge = { from: string; to: string; label?: string };

export type RelationGraph = { nodes: RelationNode[]; edges: RelationEdge[] };

export type ReviewJob = {
  id: string;
  projectId: string;
  folderCode?: string;
  reviewType: string;
  status: string;
  reportBaseName: string;
  createdAt: string;
};

export type ReviewReport = {
  id: string;
  projectId: string;
  folderCode?: string;
  reviewJobId: string;
  baseName: string;
  title: string;
  markdownContent: string;
  createdAt: string;
};

export async function listProjects(includeDeleted = false): Promise<Project[]> {
  const data = await request<{ projects: Project[] }>(`/api/projects?includeDeleted=${includeDeleted}`);
  return data.projects;
}

export async function createProject(input: { name: string; productCode?: string; description?: string }) {
  return request<{ project: Project; folders: ProjectFolder[] }>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getProject(projectId: string) {
  return request<{ project: Project; folders: ProjectFolder[] }>(`/api/projects/${projectId}`);
}

export async function softDeleteProject(projectId: string) {
  return request<{ project: Project }>(`/api/projects/${projectId}`, { method: "DELETE" });
}

export async function restoreProject(projectId: string) {
  return request<{ project: Project }>(`/api/projects/${projectId}/restore`, { method: "POST" });
}

export async function getFolder(projectId: string, folderCode: string) {
  return request<{
    folder: ProjectFolder;
    modules: ReviewModule[];
    materials: MaterialObject[];
    reports: ReviewReport[];
    missingHints: string[];
    conflicts: CrossModuleConflict[];
  }>(`/api/projects/${projectId}/folders/${folderCode}`);
}

export async function uploadMaterials(projectId: string, folderCode: string, files: FileList, type?: MaterialObjectType, moduleCodes: string[] = []) {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append("materials", file);
    formData.append("relativePaths", getRelativePath(file));
  });
  if (type) formData.append("type", type);
  moduleCodes.forEach((moduleCode) => formData.append("moduleCodes", moduleCode));
  return request<{ materials: MaterialObject[] }>(`/api/projects/${projectId}/folders/${folderCode}/materials`, {
    method: "POST",
    body: formData,
    json: false,
  });
}

export async function deleteMaterial(materialId: string, action: MaterialDeleteAction) {
  const endpoint = action === "彻底删除" ? `/api/materials/${materialId}/permanent` : `/api/materials/${materialId}`;
  return request(endpoint, {
    method: "DELETE",
    body: JSON.stringify({ action }),
  });
}

export async function restoreMaterial(materialId: string) {
  return request<{ material: MaterialObject }>(`/api/materials/${materialId}/restore`, { method: "POST" });
}

export async function createReview(projectId: string, folderCode: string, reviewType: string) {
  return request<{ review: ReviewJob; reports: ReviewReport[] }>(`/api/projects/${projectId}/folders/${folderCode}/reviews`, {
    method: "POST",
    body: JSON.stringify({ reviewType }),
  });
}

export async function listModules(projectId: string, folderCode: string) {
  return request<{ modules: ReviewModule[] }>(`/api/projects/${projectId}/folders/${folderCode}/modules`);
}

export async function interpretModule(projectId: string, folderCode: string, moduleCode: string, reviewType = "模块深度解读") {
  return request<{ interpretation: ModuleInterpretation; report: ReviewReport }>(
    `/api/projects/${projectId}/folders/${folderCode}/modules/${moduleCode}/interpret`,
    {
      method: "POST",
      body: JSON.stringify({ reviewType }),
    },
  );
}

export async function confirmModule(projectId: string, folderCode: string, moduleCode: string) {
  return request<{ interpretation: ModuleInterpretation }>(
    `/api/projects/${projectId}/folders/${folderCode}/modules/${moduleCode}/confirm`,
    { method: "POST" },
  );
}

export async function listReports(projectId: string, folderCode: string) {
  return request<{ reports: ReviewReport[] }>(`/api/projects/${projectId}/folders/${folderCode}/reports`);
}

export function reportDownloadUrl(projectId: string, reportId: string): string {
  return `${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/reports/${encodeURIComponent(reportId)}/download`;
}

export async function getMissingHints(projectId: string, folderCode: string) {
  return request<{ missingHints: string[] }>(`/api/projects/${projectId}/folders/${folderCode}/missing-hints`);
}

export async function listRecycleBin() {
  return request<{ materials: MaterialObject[] }>("/api/recycle-bin");
}

/** 获取资料对象详情页（含版本历史、审查记录、审计日志） */
export async function getMaterialDetail(projectId: string, materialId: string) {
  return request<MaterialDetail>(`/api/projects/${projectId}/materials/${materialId}`);
}

/** 上传资料对象新版本（替换） */
export async function addMaterialVersion(projectId: string, materialId: string, file: File, options?: { note?: string; versionTag?: string }) {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.note) formData.append("note", options.note);
  if (options?.versionTag) formData.append("versionTag", options.versionTag);
  return request<{ material: MaterialObject; version: MaterialVersion }>(
    `/api/projects/${projectId}/materials/${materialId}/versions`,
    { method: "POST", body: formData, json: false },
  );
}

/** 设置资料对象当前有效版本 */
export async function setEffectiveVersion(projectId: string, materialId: string, versionId: string) {
  return request<{ material: MaterialObject; version: MaterialVersion }>(
    `/api/projects/${projectId}/materials/${materialId}/effective-version`,
    { method: "PATCH", body: JSON.stringify({ versionId }) },
  );
}

/** 运行 BOM/图纸专项对应检查 */
export async function runBomCheck(projectId: string, folderCode: string) {
  return request<BomDrawingCheckResult>(
    `/api/projects/${projectId}/folders/${folderCode}/bom-check`,
    { method: "POST" },
  );
}

/** 获取历史 BOM/图纸检查结果 */
export async function listBomCheckResults(projectId: string, folderCode: string) {
  return request<{ results: BomDrawingCheckResult[] }>(
    `/api/projects/${projectId}/folders/${folderCode}/bom-check`,
  );
}

/** 获取关联关系图 */
export async function getRelationGraph(projectId: string, folderCode: string) {
  return request<RelationGraph>(`/api/projects/${projectId}/folders/${folderCode}/relation-graph`);
}

/** 项目内AI问答 */
export async function askProjectQa(projectId: string, question: string) {
  return request<{ qa: AiQaRecord }>(`/api/projects/${projectId}/ai-qa`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

/** 获取项目历史AI问答 */
export async function listProjectQa(projectId: string) {
  return request<{ qas: AiQaRecord[] }>(`/api/projects/${projectId}/ai-qa`);
}

/** 全局资料库AI问答 */
export async function askGlobalQa(question: string) {
  return request<{ qa: AiQaRecord }>("/api/ai-qa/global", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

/** 获取项目审计日志 */
export async function listAuditLogs(projectId: string) {
  return request<{ logs: AuditLog[] }>(`/api/projects/${projectId}/audit-logs`);
}

function getRelativePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

async function request<T>(path: string, init: RequestInit & { json?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== false) headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? response.statusText);
  }

  return response.json() as Promise<T>;
}
