import { runClosureArchiveModule } from "../modules/closureArchiveModule.ts";
import { runDfmReviewModule } from "../modules/dfmReviewModule.ts";
import { runEcoReviewModule } from "../modules/ecoReviewModule.ts";
import { runFileIntakeModule } from "../modules/fileIntakeModule.ts";
import { runGovernanceModule } from "../modules/governanceModule.ts";
import { runKnowledgeCaptureModule } from "../modules/knowledgeCaptureModule.ts";
import { runStageGateModule } from "../modules/stageGateModule.ts";
import { runStructuralRiskModule } from "../modules/structuralRiskModule.ts";
import { runUserInteractionModule } from "../modules/userInteractionModule.ts";
import type { ParsedDocument } from "../types.ts";

export type ReviewMode =
  | "快速审查"
  | "完整审查"
  | "DFM专项"
  | "ECO专项"
  | "归档专项"
  | "会议准备";

export interface StructuralReviewInput {
  reviewMode: ReviewMode;
  files: string[];
  parsedDocuments?: ParsedDocument[];
  projectInfo: Record<string, unknown>;
}

export interface StructuralReviewResult {
  summary: string;
  sections: Record<string, unknown>;
  markdownReport: string;
}

export async function runStructuralReviewAgent(
  input: StructuralReviewInput,
): Promise<StructuralReviewResult> {
  // M0 总控 Agent：负责判断审查模式，决定调用哪些模块，并把结果合并成最终报告。
  // 注意：任何设计结论都必须带依据、置信度和需人工确认项，不能直接替代工程师最终判断。
  const fileIntake = await runFileIntakeModule(input);
  const stageGate = await runStageGateModule(input, fileIntake);

  const shouldRunFullReview = input.reviewMode === "完整审查";
  const shouldRunDfm = shouldRunFullReview || input.reviewMode === "DFM专项";
  const shouldRunEco = shouldRunFullReview || input.reviewMode === "ECO专项";
  const shouldRunArchive = shouldRunFullReview || input.reviewMode === "归档专项";
  const shouldRunMeeting = input.reviewMode === "会议准备";
  const shouldRunKnowledge = shouldRunFullReview || shouldRunArchive;

  const structuralRisk = await runStructuralRiskModule(input, stageGate);
  const dfm = shouldRunDfm ? await runDfmReviewModule(input, fileIntake) : undefined;
  const eco = shouldRunEco ? await runEcoReviewModule(input, fileIntake) : undefined;
  const closureArchive = shouldRunArchive || shouldRunMeeting
    ? await runClosureArchiveModule(input, fileIntake)
    : undefined;
  const knowledgeCapture = shouldRunKnowledge
    ? await runKnowledgeCaptureModule(input, { stageGate, structuralRisk, dfm, eco, closureArchive })
    : undefined;
  const userInteraction = await runUserInteractionModule(input, {
    fileIntake,
    stageGate,
    structuralRisk,
    dfm,
    eco,
    closureArchive,
  });
  const governance = knowledgeCapture
    ? await runGovernanceModule(input, { knowledgeCapture, userInteraction })
    : undefined;
  const sections = {
    fileIntake,
    stageGate,
    structuralRisk,
    dfm,
    eco,
    closureArchive,
    knowledgeCapture,
    userInteraction,
    governance,
  };

  return {
    summary: `结构项目资料审查完成：阶段 ${stageGate.judgedStage}，Gate 建议 ${stageGate.gateRecommendation}。`,
    sections,
    markdownReport: buildMarkdownReport(input, sections),
  };
}

function buildMarkdownReport(
  input: StructuralReviewInput,
  sections: {
    fileIntake: Awaited<ReturnType<typeof runFileIntakeModule>>;
    stageGate: Awaited<ReturnType<typeof runStageGateModule>>;
    structuralRisk: Awaited<ReturnType<typeof runStructuralRiskModule>>;
    dfm?: Awaited<ReturnType<typeof runDfmReviewModule>>;
    eco?: Awaited<ReturnType<typeof runEcoReviewModule>>;
    closureArchive?: Awaited<ReturnType<typeof runClosureArchiveModule>>;
    knowledgeCapture?: Awaited<ReturnType<typeof runKnowledgeCaptureModule>>;
    userInteraction: Awaited<ReturnType<typeof runUserInteractionModule>>;
    governance?: Awaited<ReturnType<typeof runGovernanceModule>>;
  },
): string {
  const {
    fileIntake,
    stageGate,
    structuralRisk,
    dfm,
    eco,
    closureArchive,
    knowledgeCapture,
    userInteraction,
    governance,
  } = sections;

  return [
    "# 结构项目资料审查报告",
    "",
    "## 0. 报告信息",
    "",
    `- 审查模式：${input.reviewMode}`,
    `- 输入文件数量：${fileIntake.fileCount}`,
    `- 文档解析：成功 ${fileIntake.parseSummary.parsed}，失败 ${fileIntake.parseSummary.failed}，不支持 ${fileIntake.parseSummary.unsupported}`,
    `- 重要限制：本报告为 AI 辅助审查，不替代结构、质量、法规、测试或模具人员最终判断。`,
    "",
    "## 1. 项目阶段识别",
    "",
    `- AI 判断阶段：${stageGate.judgedStage}`,
    `- 判断置信度：${stageGate.confidence}`,
    `- 阶段建议：${stageGate.gateRecommendation}`,
    `- 缺失关键资料：${stageGate.missingDocuments.length ? stageGate.missingDocuments.join("、") : "未发现"}`,
    "",
    "## 2. 文件完整性与命名审查",
    "",
    `- ${fileIntake.summary}`,
    `- 不支持文件：${fileIntake.unsupportedFiles.length ? fileIntake.unsupportedFiles.join("；") : "未发现"}`,
    `- 解析失败：${fileIntake.parseFailures.length ? fileIntake.parseFailures.map((item) => `${item.filePath}: ${item.message}`).join("；") : "未发现"}`,
    "",
    "## 3. 结构风险清单",
    "",
    ...formatRisks(structuralRisk.risks),
    "",
    "## 4. DFM/ECO/闭环状态",
    "",
    `- DFM：${dfm?.summary ?? "本次未运行 DFM 专项"}`,
    `- ECO：${eco?.summary ?? "本次未运行 ECO 专项"}`,
    `- 闭环：${closureArchive?.summary ?? "本次未运行闭环/归档专项"}`,
    "",
    "## 5. 知识沉淀与规则迭代",
    "",
    `- 知识沉淀：${knowledgeCapture?.summary ?? "本次未运行知识沉淀"}`,
    `- 规则更新：${governance?.summary ?? "本次未运行治理规则队列"}`,
    ...formatKnowledgeEntries(knowledgeCapture?.entries ?? []),
    "",
    "## 6. 平台交互与补充问题",
    "",
    `- 推荐入口：${userInteraction.selectedEntryPoint}`,
    `- 导出建议：${userInteraction.exportOptions.filter((option) => option.recommendedNow).map((option) => option.format).join("、") || "Markdown"}`,
    ...formatSupplementalQuestions(userInteraction.supplementalQuestions),
    "",
    "## 7. 需要人工确认",
    "",
    ...stageGate.confirmationItems.map((item) => `- ${item}`),
    ...(governance?.permissionChecklist.slice(0, 3).map((item) => `- ${item}`) ?? []),
    "",
    "## 8. 下一步建议",
    "",
    "- 优先补齐缺失的阶段关键资料。",
    "- 对高风险项组织结构工程师确认。",
    "- 对 ECO、测试失败关闭、法规注册影响和阶段放行结论进行人工确认。",
    "- 将已确认的高频问题点沉淀到知识库，规则更新需走审批流程。",
  ].join("\n");
}

function formatRisks(risks: Awaited<ReturnType<typeof runStructuralRiskModule>>["risks"]): string[] {
  if (risks.length === 0) return ["- 未基于当前文件名和阶段资料识别到明确结构风险。"];

  return risks.map((risk) =>
    `- ${risk.id}｜${risk.riskLevel}｜${risk.description}｜建议：${risk.recommendation}`,
  );
}

function formatKnowledgeEntries(
  entries: Awaited<ReturnType<typeof runKnowledgeCaptureModule>>["entries"],
): string[] {
  if (entries.length === 0) return ["- 暂无知识沉淀候选。"];

  return entries.slice(0, 8).map((entry) =>
    `- ${entry.id}｜${entry.category}｜${entry.issueType}｜${entry.description}`,
  );
}

function formatSupplementalQuestions(
  questions: Awaited<ReturnType<typeof runUserInteractionModule>>["supplementalQuestions"],
): string[] {
  if (questions.length === 0) return ["- 暂无需要补充的问题。"];

  return questions.map((question, index) =>
    `- Q${index + 1}: ${question.question} 原因：${question.reason} 影响：${question.impact}`,
  );
}
