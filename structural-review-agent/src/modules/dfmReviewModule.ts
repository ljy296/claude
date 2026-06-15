import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import type { FileIntakeResult } from "./fileIntakeModule.ts";

export interface DfmReviewResult {
  module: string;
  summary: string;
  issueCount: number;
  highRiskCount: number;
  issues: Array<{
    id: string;
    sourceFile: string;
    issueType: string;
    riskLevel: "高" | "中" | "低";
    status: "待确认" | "资料不足";
    confirmationQuestion: string;
  }>;
}

export async function runDfmReviewModule(
  input: StructuralReviewInput,
  fileIntakeResult?: FileIntakeResult,
): Promise<DfmReviewResult> {
  // M4 DFM 专项评审模块：
  // 从 DFM PPT、PDF、Excel 问题清单或会议纪要中提取问题。
  // 重点保留“供应商原始意见”和“AI 理解的结构风险”的区别，避免把 AI 推断当作供应商结论。
  const dfmFiles = (fileIntakeResult?.files ?? [])
    .filter((file) => `${file.path}_${file.inferredStage ?? ""}_${file.inferredDocumentType ?? ""}`.includes("DFM"));
  const dfmDocuments = (input.parsedDocuments ?? [])
    .filter((document) => document.filePath.includes("DFM") || document.text.includes("DFM"));
  const sources = [
    ...dfmFiles.map((file) => ({ sourceFile: file.path, text: file.path })),
    ...dfmDocuments.map((document) => ({ sourceFile: document.filePath, text: document.text })),
  ];
  const uniqueSources = sources.filter((source, index, array) =>
    array.findIndex((item) => item.sourceFile === source.sourceFile) === index,
  );
  const issues = uniqueSources.map((source, index) => ({
    id: `DFM-${String(index + 1).padStart(3, "0")}`,
    sourceFile: source.sourceFile,
    issueType: inferDfmIssueType(source.text),
    riskLevel: inferDfmRiskLevel(source.text),
    status: "待确认" as const,
    confirmationQuestion: "请结构工程师确认该 DFM 项是否已评审、是否接受供应商建议、是否需要改图或 ECO。",
  }));

  return {
    module: "M4 DFM Review",
    summary: `识别 DFM 相关来源 ${uniqueSources.length} 个，生成待确认 DFM 项 ${issues.length} 项。`,
    issueCount: issues.length,
    highRiskCount: issues.filter((issue) => issue.riskLevel === "高").length,
    issues,
  };
}

function inferDfmIssueType(text: string): string {
  const candidates = ["脱模", "缩水", "壁厚", "分型线", "顶针", "滑块", "斜顶", "外观", "装配", "强度", "公差", "成本"];
  const matched = candidates.find((candidate) => text.includes(candidate));
  return matched ? `${matched}风险` : "需从DFM报告正文提取";
}

function inferDfmRiskLevel(text: string): "高" | "中" | "低" {
  if (["高风险", "改图", "ECO", "强度", "公差", "装配"].some((keyword) => text.includes(keyword))) return "高";
  if (["外观", "分型线", "缩水", "壁厚"].some((keyword) => text.includes(keyword))) return "中";
  return "低";
}
