export type Confidence = "高" | "中" | "低" | "未知";
export type RiskLevel = "高" | "中" | "低";
export type ReviewStatus = "满足" | "部分满足" | "不满足" | "需确认";
export type ParseStatus = "parsed" | "failed" | "unsupported";
export type ExportFormat = "markdown" | "excel" | "word" | "pdf";

export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
  folderStage?: string;
  parsedName?: {
    projectName?: string;
    stage?: string;
    documentType?: string;
    version?: string;
    date?: string;
    status?: string;
  };
  namingIssues: string[];
  inferredStage?: string;
  inferredDocumentType?: string;
}

export interface ParsedTable {
  sheetName?: string;
  title?: string;
  rows: string[][];
}

export interface ParseFinding {
  keyword: string;
  category: "stage" | "risk" | "dfm" | "eco" | "closure" | "unknown";
  confidence: Confidence;
}

export interface ParsedDocument {
  filePath: string;
  fileType: string;
  text: string;
  tables: ParsedTable[];
  findings: ParseFinding[];
  parseStatus: ParseStatus;
  confidence: Confidence;
  message?: string;
}

export interface ExportResult {
  format: ExportFormat;
  outputPath: string;
  status: "exported" | "failed";
  message?: string;
}

export interface Issue {
  id: string;
  description: string;
  riskLevel: RiskLevel;
  source: string;
  confidence: Confidence;
  recommendation: string;
  requiresConfirmation: boolean;
}

export interface SupplementalQuestion {
  question: string;
  reason: string;
  impact: string;
}

export interface ModuleResult {
  module: string;
  summary: string;
}

export interface KnowledgeEntry {
  id: string;
  category: "结构高频问题点" | "DFM高频问题点" | "ECO高频原因" | "测试失败高频问题" | "阶段评审常见缺失项" | "设计规范更新建议";
  stage?: string;
  issueType: string;
  description: string;
  source: string;
  confidence: Confidence;
  status: "待确认" | "已确认" | "建议沉淀";
}

export interface RuleUpdateSuggestion {
  id: string;
  originalRule: string;
  feedbackOrTrigger: string;
  suggestedChange: string;
  applicableStage?: string;
  requiresAdminApproval: boolean;
  status: "AI建议更新" | "结构工程师确认" | "管理员批准" | "规则已发布" | "规则已归档";
}

export interface AuditLogRecord {
  action: string;
  actor: string;
  timestamp: string;
  target: string;
  detail: string;
}
