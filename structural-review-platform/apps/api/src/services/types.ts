import type {
  FolderStatus,
  MaterialObjectType,
  ModuleStatus,
  ReviewModuleConfig,
  EvidenceTrace,
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
  /** 服务器内部存储路径。仅供服务端使用，禁止直接返回给客户端。 */
  storagePath?: string;
  sizeBytes?: number;
  mimeType?: string;
  deletedAt?: string;
  permanentlyDeletedAt?: string;
  createdAt: string;
  effectiveVersion?: string;
  versionIds: string[];
  activeVersionId?: string;
  metadata?: string;
};

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

export type AiQaEvidenceSource = {
  type: "project" | "folder" | "module" | "material" | "report" | "risk" | "interpretation";
  id: string;
  label: string;
  folderCode?: string;
  moduleCode?: string;
  timestamp?: string;
};

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
  action: string;
  targetType: string;
  targetId?: string;
  message?: string;
  createdAt: string;
};

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

/** 对外安全 DTO：剥离 storagePath 等服务器内部字段。 */
export type PublicMaterialObject = Omit<MaterialObjectRecord, "storagePath">;
export type PublicMaterialVersion = Omit<MaterialVersionRecord, "storagePath">;
