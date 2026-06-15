import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import type { ClosureArchiveResult } from "./closureArchiveModule.ts";
import type { DfmReviewResult } from "./dfmReviewModule.ts";
import type { EcoReviewResult } from "./ecoReviewModule.ts";
import type { FileIntakeResult } from "./fileIntakeModule.ts";
import type { StageGateResult } from "./stageGateModule.ts";
import type { StructuralRiskResult } from "./structuralRiskModule.ts";
import type { ModuleResult, SupplementalQuestion } from "../types.ts";
import { structuralReviewRules } from "../rules/structuralRules.ts";

export interface UserInteractionResult extends ModuleResult {
  reviewMode: StructuralReviewInput["reviewMode"];
  selectedEntryPoint: string;
  fixedFolders: Array<{
    name: string;
    status: string;
    actions: string[];
  }>;
  progressSteps: Array<{
    step: string;
    status: "completed" | "pending";
  }>;
  supplementalQuestions: SupplementalQuestion[];
  exportOptions: Array<{
    format: "Markdown" | "Excel" | "Word" | "PPT" | "PDF";
    purpose: string;
    recommendedNow: boolean;
  }>;
  resultPagePrompt: string;
}

export async function runUserInteractionModule(
  input: StructuralReviewInput,
  context: {
    fileIntake: FileIntakeResult;
    stageGate: StageGateResult;
    structuralRisk: StructuralRiskResult;
    dfm?: DfmReviewResult;
    eco?: EcoReviewResult;
    closureArchive?: ClosureArchiveResult;
  },
): Promise<UserInteractionResult> {
  // M8 用户交互与导出模块：
  // 把评审流程转成平台入口、上传提示、进度展示、补充问题表、结果页提示和导出格式。
  // 目标是“不让用户给 AI 打工”：先自动审查已有资料，再只追问关键缺口。
  const supplementalQuestions = buildSupplementalQuestions(context).slice(0, 10);

  return {
    module: "M8 User Interaction And Export",
    summary: `已生成平台交互建议：入口 ${getEntryPoint(input.reviewMode)}，补充问题 ${supplementalQuestions.length} 条。`,
    reviewMode: input.reviewMode,
    selectedEntryPoint: getEntryPoint(input.reviewMode),
    fixedFolders: structuralReviewRules.stages.map((name) => ({
      name,
      status: "未上传",
      actions: ["上传文件/文件夹", "查看资料", "开始审查", "历史报告", "缺失项提示"],
    })),
    progressSteps: [
      "正在识别项目文件夹",
      "正在识别文件类型与资料阶段",
      "正在检查文件命名规范",
      "正在判断最新版本文件",
      "正在检查资料完整性",
      "正在识别当前项目阶段",
      "正在提取结构信息",
      "正在解析 DFM / ECO / 测试资料",
      "正在生成风险清单",
      "正在生成补充问题",
      "正在生成审查报告",
    ].map((step) => ({ step, status: "completed" as const })),
    supplementalQuestions,
    exportOptions: [
      { format: "Markdown", purpose: "平台内直接展示审查报告", recommendedNow: true },
      { format: "Excel", purpose: "导出问题清单、DFM 台账、ECO 影响表", recommendedNow: Boolean(context.dfm || context.eco) },
      { format: "Word", purpose: "生成正式审查报告草稿", recommendedNow: input.reviewMode === "完整审查" },
      { format: "PPT", purpose: "生成评审会议汇报材料", recommendedNow: input.reviewMode === "会议准备" },
      { format: "PDF", purpose: "归档报告", recommendedNow: input.reviewMode === "归档专项" },
    ],
    resultPagePrompt: "以下结果为基于当前上传资料的辅助审查结论，不替代结构工程师、质量、法规、测试或模具人员的最终判断。请优先关注高风险项、未闭环项和需补充确认的问题。",
  };
}

function getEntryPoint(reviewMode: StructuralReviewInput["reviewMode"]): string {
  const map: Record<StructuralReviewInput["reviewMode"], string> = {
    快速审查: "固定目录页-选择分类后快速审查",
    完整审查: "固定目录页-选择分类后完整审查",
    DFM专项: "DFM报告解析",
    ECO专项: "ECO/ECN变更评审",
    归档专项: "项目归档审查",
    会议准备: "评审会议准备",
  };
  return map[reviewMode];
}

function buildSupplementalQuestions(context: {
  fileIntake: FileIntakeResult;
  stageGate: StageGateResult;
  structuralRisk: StructuralRiskResult;
  dfm?: DfmReviewResult;
  eco?: EcoReviewResult;
  closureArchive?: ClosureArchiveResult;
}): SupplementalQuestion[] {
  const questions: SupplementalQuestion[] = [];

  for (const missingDocument of context.stageGate.missingDocuments.slice(0, 5)) {
    questions.push({
      question: `请补充或确认当前阶段是否已有 ${missingDocument}。`,
      reason: "该资料影响阶段准入判断和结构风险判断。",
      impact: "阶段 Gate、结构风险、下一步建议",
    });
  }

  if (context.fileIntake.namingIssueCount > 0) {
    questions.push({
      question: "是否允许 AI 基于当前非规范命名文件继续做临时审查？",
      reason: "部分文件命名不完整，可能影响阶段、版本和资料类型识别。",
      impact: "文件追溯、正式归档、版本一致性",
    });
  }

  if ((context.dfm?.issueCount ?? 0) > 0) {
    questions.push({
      question: "DFM 问题是否已有结构工程师评审结论或供应商回复？",
      reason: "DFM 状态会影响是否需要改图、试模确认或触发 ECO。",
      impact: "DFM 闭环、开模准备、ECO 判断",
    });
  }

  if ((context.eco?.missingItems.length ?? 0) > 0) {
    questions.push({
      question: "ECO/ECN 缺失项是否已有其他文件或系统记录可作为依据？",
      reason: "ECO 关键资料不完整时，无法形成可靠的批准准备度建议。",
      impact: "ECO 影响分析、验证计划、会签建议",
    });
  }

  if ((context.closureArchive?.highRiskOpenItems.length ?? 0) > 0) {
    questions.push({
      question: "未闭环事项是否已有责任人、截止日期和验证证据？",
      reason: "闭环证据不足会影响阶段放行、归档和经验沉淀。",
      impact: "测试闭环、会议行动项、项目归档",
    });
  }

  return questions;
}
