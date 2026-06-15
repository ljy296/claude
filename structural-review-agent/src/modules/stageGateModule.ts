import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import { structuralReviewRules } from "../rules/structuralRules.ts";
import type { Confidence, ModuleResult, ReviewStatus } from "../types.ts";
import type { FileIntakeResult } from "./fileIntakeModule.ts";

export interface StageGateResult extends ModuleResult {
  reviewMode: StructuralReviewInput["reviewMode"];
  judgedStage: string;
  evidence: string[];
  confidence: Confidence;
  minimumDocumentCheck: Array<{
    requiredKeyword: string;
    status: ReviewStatus;
    evidence?: string;
  }>;
  missingDocuments: string[];
  gateRecommendation: "建议通过" | "有条件通过" | "不建议通过" | "无法判断";
  confirmationItems: string[];
}

export async function runStageGateModule(
  input: StructuralReviewInput,
  fileIntakeResult: FileIntakeResult,
): Promise<StageGateResult> {
  // M2 阶段识别与准入模块：
  // 根据文件夹名称、文件名、资料内容关键词判断项目阶段。
  // 再按“最小资料集”和阶段准入标准判断是否允许进入下一阶段。
  // 输出必须包含判断依据、置信度、缺失资料和需人工确认项。
  const stageScores = scoreStages(fileIntakeResult, input);
  const [judgedStage, score = 0] = stageScores[0] ?? ["未知阶段", 0];
  const normalizedStage = normalizeStageForMinimumDocuments(judgedStage);
  const requiredDocuments = getMinimumDocuments(normalizedStage);
  const minimumDocumentCheck = requiredDocuments.map((requiredKeyword) => {
    const matchedFile = fileIntakeResult.files.find((file) =>
      `${file.path}_${file.inferredDocumentType ?? ""}`.includes(requiredKeyword),
    );
    const matchedDocument = input.parsedDocuments?.find((document) =>
      document.text.includes(requiredKeyword) || document.findings.some((finding) => finding.keyword.includes(requiredKeyword)),
    );

    return {
      requiredKeyword,
      status: matchedFile || matchedDocument ? "满足" as const : "不满足" as const,
      evidence: matchedFile?.path ?? matchedDocument?.filePath,
    };
  });
  const missingDocuments = minimumDocumentCheck
    .filter((item) => item.status !== "满足")
    .map((item) => item.requiredKeyword);
  const confidence = getConfidence(score, fileIntakeResult.files.length);
  const gateRecommendation = getGateRecommendation(missingDocuments.length, requiredDocuments.length);

  return {
    module: "M2 Stage Identification And Gate Review",
    summary: `判断阶段为 ${judgedStage}，缺失关键资料 ${missingDocuments.length} 项，阶段建议为 ${gateRecommendation}。`,
    reviewMode: input.reviewMode,
    judgedStage,
    evidence: fileIntakeResult.files
      .filter((file) => file.inferredStage === judgedStage || file.folderStage === judgedStage)
      .map((file) => file.path)
      .slice(0, 10),
    confidence,
    minimumDocumentCheck,
    missingDocuments,
    gateRecommendation,
    confirmationItems: [
      "当前阶段判断需结构工程师确认",
      "是否允许进入下一阶段需项目评审确认",
      ...missingDocuments.map((document) => `${document} 缺失或需确认`),
    ],
  };
}

function scoreStages(
  fileIntakeResult: FileIntakeResult,
  input: StructuralReviewInput,
): Array<[string, number]> {
  const scores = new Map<string, number>();

  for (const file of fileIntakeResult.files) {
    for (const stage of [file.folderStage, file.inferredStage, file.parsedName?.stage]) {
      if (!stage) continue;
      scores.set(stage, (scores.get(stage) ?? 0) + 1);
    }
  }

  for (const document of input.parsedDocuments ?? []) {
    for (const [stage, keywords] of Object.entries(structuralReviewRules.stageKeywords)) {
      const hits = keywords.filter((keyword) => document.text.includes(keyword)).length;
      if (hits > 0) scores.set(stage, (scores.get(stage) ?? 0) + hits);
    }
  }

  return [...scores.entries()].sort((a, b) => b[1] - a[1]);
}

function normalizeStageForMinimumDocuments(stage: string): keyof typeof structuralReviewRules.minimumDocuments | undefined {
  if (stage === "ECO/ECN" || stage === "ECO" || stage === "ECN") return "MED_005&007_01_ECN";
  if (stage === "项目归档" || stage === "归档" || stage === "量产承认") return "MED_009_量产承认";
  if (stage in structuralReviewRules.minimumDocuments) {
    return stage as keyof typeof structuralReviewRules.minimumDocuments;
  }
  return undefined;
}

function getMinimumDocuments(stage: keyof typeof structuralReviewRules.minimumDocuments | undefined): readonly string[] {
  return stage ? structuralReviewRules.minimumDocuments[stage] : [];
}

function getConfidence(score: number, fileCount: number): Confidence {
  if (fileCount === 0 || score === 0) return "未知";
  if (score >= 3) return "高";
  if (score >= 2) return "中";
  return "低";
}

function getGateRecommendation(
  missingCount: number,
  requiredCount: number,
): StageGateResult["gateRecommendation"] {
  if (requiredCount === 0) return "无法判断";
  if (missingCount === 0) return "建议通过";
  if (missingCount <= Math.ceil(requiredCount / 2)) return "有条件通过";
  return "不建议通过";
}
