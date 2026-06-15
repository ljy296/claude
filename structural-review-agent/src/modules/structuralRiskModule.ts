import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import type { Issue, ModuleResult } from "../types.ts";
import type { StageGateResult } from "./stageGateModule.ts";

export interface StructuralRiskResult extends ModuleResult {
  reviewMode: StructuralReviewInput["reviewMode"];
  risks: Issue[];
  reviewDimensions: string[];
}

export async function runStructuralRiskModule(
  input: StructuralReviewInput,
  stageGateResult: StageGateResult,
): Promise<StructuralRiskResult> {
  // M3 结构风险评审模块：
  // 从结构工程师职责出发检查需求输入、ID 可实现性、结构方案、详细设计和医疗器械结构关注点。
  // 这里不能假装完成 3D 干涉、强度仿真或模流分析，只能基于资料明确信息和合理推断输出风险。
  const risks: Issue[] = [];

  for (const missingDocument of stageGateResult.missingDocuments) {
    risks.push({
      id: `SR-${String(risks.length + 1).padStart(3, "0")}`,
      description: `当前阶段缺少关键资料：${missingDocument}`,
      riskLevel: isHighImpactDocument(missingDocument) ? "高" : "中",
      source: "阶段最小资料集检查",
      confidence: "中",
      recommendation: `补充或确认 ${missingDocument} 后再做阶段结论。`,
      requiresConfirmation: true,
    });
  }

  if (stageGateResult.judgedStage === "结构方案" && stageGateResult.missingDocuments.length > 0) {
    risks.push({
      id: `SR-${String(risks.length + 1).padStart(3, "0")}`,
      description: "结构方案资料不完整，可能无法充分判断装配、固定、密封、跌落和 DFM 初步风险。",
      riskLevel: "中",
      source: "结构方案阶段 Gate",
      confidence: "中",
      recommendation: "优先补充爆炸图、关键截面图、初版 BOM 和结构风险清单。",
      requiresConfirmation: true,
    });
  }

  for (const document of input.parsedDocuments ?? []) {
    const riskKeywords = [
      { keyword: "清洁消毒", description: "资料提到清洁消毒要求，需确认材料兼容性、缝隙死角和标签耐久性。" },
      { keyword: "法规", description: "资料提到法规要求，需确认是否影响注册资料、风险管理、说明书或标签。" },
      { keyword: "可靠性", description: "资料提到可靠性要求，需确认结构验证项目和验收标准。" },
      { keyword: "跌落", description: "资料提到跌落要求，需确认外壳固定、内部器件固定和包装运输保护。" },
      { keyword: "振动", description: "资料提到振动要求，需确认紧固、防松和连接器可靠性。" },
    ];

    for (const item of riskKeywords) {
      if (!document.text.includes(item.keyword)) continue;
      risks.push({
        id: `SR-${String(risks.length + 1).padStart(3, "0")}`,
        description: item.description,
        riskLevel: item.keyword === "法规" ? "高" : "中",
        source: document.filePath,
        confidence: document.confidence,
        recommendation: `围绕“${item.keyword}”补充结构设计输入、验证证据或人工确认结论。`,
        requiresConfirmation: true,
      });
    }
  }

  return {
    module: "M3 Structural Risk Review",
    summary: `识别结构风险 ${risks.length} 项，其中高风险 ${risks.filter((risk) => risk.riskLevel === "高").length} 项。`,
    reviewMode: input.reviewMode,
    risks,
    reviewDimensions: [
      "需求转结构输入",
      "ID可实现性",
      "结构方案",
      "详细设计",
      "医疗器械结构关注点",
    ],
  };
}

function isHighImpactDocument(document: string): boolean {
  return ["法规", "可靠性", "验证", "最终BOM", "最终图纸", "问题关闭"].some((keyword) =>
    document.includes(keyword),
  );
}
