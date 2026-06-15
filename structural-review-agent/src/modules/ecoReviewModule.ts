import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import type { FileIntakeResult } from "./fileIntakeModule.ts";

export interface EcoReviewResult {
  module: string;
  summary: string;
  ecoFileCount: number;
  impactAnalysis: Array<{
    category: string;
    status: "可能影响" | "未见证据" | "需确认";
    evidence?: string;
    recommendation: string;
  }>;
  missingItems: string[];
  approvalReadiness: "建议批准" | "有条件批准" | "不建议批准" | "无法判断";
  manualConfirmationRequired: string[];
}

export async function runEcoReviewModule(
  input: StructuralReviewInput,
  fileIntakeResult?: FileIntakeResult,
): Promise<EcoReviewResult> {
  // M5 ECO/ECN 影响评审模块：
  // 检查变更原因、变更前后对比、受影响零件、BOM、图纸、模具、生产、检验、验证和法规注册影响。
  // 该模块只能给出“批准准备度建议”，不能直接替代 ECO 会签或最终批准。
  const ecoFiles = (fileIntakeResult?.files ?? [])
    .filter((file) => /ECO|ECN|变更|会签|验证计划/.test(file.path));
  const ecoDocuments = (input.parsedDocuments ?? [])
    .filter((document) => /ECO|ECN|变更|会签|验证/.test(`${document.filePath}\n${document.text}`));
  const requiredItems = ["ECO申请", "变更前后对比", "变更影响分析", "验证计划", "会签"];
  const missingItems = requiredItems.filter(
    (item) =>
      !ecoFiles.some((file) => file.path.includes(item)) &&
      !ecoDocuments.some((document) => document.text.includes(item) || document.filePath.includes(item)),
  );
  const impactCategories = [
    "结构设计",
    "模具",
    "BOM/物料",
    "生产装配",
    "质量检验",
    "可靠性验证",
    "法规注册",
    "包装标签",
    "库存供应链",
    "售后和已出货产品",
  ];
  const impactAnalysis = impactCategories.map((category) => {
    const evidence = ecoFiles.find((file) => file.path.includes(category) || file.path.includes("影响"));
    const documentEvidence = ecoDocuments.find((document) => document.text.includes(category) || document.text.includes("影响"));
    return {
      category,
      status: evidence || documentEvidence ? "可能影响" as const : "需确认" as const,
      evidence: evidence?.path ?? documentEvidence?.filePath,
      recommendation: evidence || documentEvidence
        ? `基于 ${evidence?.name ?? documentEvidence?.filePath} 进一步确认 ${category} 的具体影响。`
        : `未见 ${category} 明确证据，需相关责任人确认。`,
    };
  });
  const approvalReadiness = getApprovalReadiness(missingItems.length, requiredItems.length);

  return {
    module: "M5 ECO ECN Impact Review",
    summary: `识别 ECO/ECN 相关文件 ${ecoFiles.length} 个、正文证据 ${ecoDocuments.length} 个，缺失关键项 ${missingItems.length} 项，批准准备度为 ${approvalReadiness}。`,
    ecoFileCount: ecoFiles.length + ecoDocuments.length,
    impactAnalysis,
    missingItems,
    approvalReadiness,
    manualConfirmationRequired: [
      "ECO/ECN 是否批准必须人工确认",
      "法规注册、标签、说明书或包装影响必须人工确认",
      ...missingItems.map((item) => `${item} 缺失或需确认`),
    ],
  };
}

function getApprovalReadiness(
  missingCount: number,
  requiredCount: number,
): EcoReviewResult["approvalReadiness"] {
  if (requiredCount === 0) return "无法判断";
  if (missingCount === 0) return "有条件批准";
  if (missingCount <= 2) return "有条件批准";
  return "不建议批准";
}
