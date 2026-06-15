import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import type { DfmReviewResult } from "./dfmReviewModule.ts";
import type { EcoReviewResult } from "./ecoReviewModule.ts";
import type { ClosureArchiveResult } from "./closureArchiveModule.ts";
import type { StageGateResult } from "./stageGateModule.ts";
import type { StructuralRiskResult } from "./structuralRiskModule.ts";
import type { KnowledgeEntry, ModuleResult, RuleUpdateSuggestion } from "../types.ts";

export interface KnowledgeCaptureResult extends ModuleResult {
  reviewMode: StructuralReviewInput["reviewMode"];
  entries: KnowledgeEntry[];
  ruleUpdateSuggestions: RuleUpdateSuggestion[];
}

export async function runKnowledgeCaptureModule(
  input: StructuralReviewInput,
  context: {
    stageGate: StageGateResult;
    structuralRisk: StructuralRiskResult;
    dfm?: DfmReviewResult;
    eco?: EcoReviewResult;
    closureArchive?: ClosureArchiveResult;
  },
): Promise<KnowledgeCaptureResult> {
  // M7 知识沉淀模块：
  // 把项目中的高频结构问题、DFM 问题、ECO 原因、测试失败经验和供应商问题沉淀为可复用知识。
  // 注意：AI 只能提出规则更新建议，不能自动发布正式设计规范。
  const entries: KnowledgeEntry[] = [
    ...context.structuralRisk.risks.map((risk, index): KnowledgeEntry => ({
      id: `K-SR-${String(index + 1).padStart(3, "0")}`,
      category: "结构高频问题点",
      stage: context.stageGate.judgedStage,
      issueType: risk.riskLevel === "高" ? "高风险结构问题" : "结构资料/设计输入缺口",
      description: risk.description,
      source: risk.source,
      confidence: risk.confidence,
      status: "待确认",
    })),
    ...(context.dfm?.issues ?? []).map((issue, index): KnowledgeEntry => ({
      id: `K-DFM-${String(index + 1).padStart(3, "0")}`,
      category: "DFM高频问题点",
      stage: "DFM",
      issueType: issue.issueType,
      description: `${issue.issueType}，来源文件：${issue.sourceFile}`,
      source: issue.sourceFile,
      confidence: "低",
      status: "待确认",
    })),
    ...(context.eco?.missingItems ?? []).map((item, index): KnowledgeEntry => ({
      id: `K-ECO-${String(index + 1).padStart(3, "0")}`,
      category: "ECO高频原因",
      stage: "ECO/ECN",
      issueType: "ECO资料缺失",
      description: `ECO/ECN 审查缺少关键项：${item}`,
      source: "ECO 最小资料检查",
      confidence: "中",
      status: "待确认",
    })),
    ...(context.closureArchive?.highRiskOpenItems ?? []).map((item, index): KnowledgeEntry => ({
      id: `K-CL-${String(index + 1).padStart(3, "0")}`,
      category: "测试失败高频问题",
      stage: context.stageGate.judgedStage,
      issueType: "闭环证据缺失",
      description: item,
      source: "闭环归档检查",
      confidence: "中",
      status: "待确认",
    })),
  ];

  const ruleUpdateSuggestions: RuleUpdateSuggestion[] = [];
  if (context.stageGate.missingDocuments.length > 0) {
    ruleUpdateSuggestions.push({
      id: "RULE-001",
      originalRule: "阶段最小资料集",
      feedbackOrTrigger: `当前阶段缺失 ${context.stageGate.missingDocuments.length} 项关键资料`,
      suggestedChange: "结合真实项目复盘结果，确认是否需要调整该阶段的最小资料集或资料命名字典。",
      applicableStage: context.stageGate.judgedStage,
      requiresAdminApproval: true,
      status: "AI建议更新",
    });
  }

  return {
    module: "M7 Knowledge Capture",
    summary: `生成知识沉淀候选 ${entries.length} 条，规则更新建议 ${ruleUpdateSuggestions.length} 条。`,
    reviewMode: input.reviewMode,
    entries,
    ruleUpdateSuggestions,
  };
}
