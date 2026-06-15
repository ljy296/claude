import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import type { FileIntakeResult } from "./fileIntakeModule.ts";

export interface ClosureArchiveResult {
  module: string;
  summary: string;
  closureChecks: Array<{
    type: "DFM" | "ECO" | "测试" | "会议行动项" | "归档";
    status: "已见关闭证据" | "未见关闭证据" | "需确认";
    evidenceFiles: string[];
    recommendation: string;
  }>;
  highRiskOpenItems: string[];
}

export async function runClosureArchiveModule(
  input: StructuralReviewInput,
  fileIntakeResult?: FileIntakeResult,
): Promise<ClosureArchiveResult> {
  // M6 闭环与归档模块：
  // 检查 DFM、ECO、测试失败和会议行动项是否形成闭环。
  // 典型链路：DFM问题 -> 改图 -> 试模确认 -> 关闭；测试失败 -> 原因分析 -> ECO/复测 -> 关闭。
  const files = fileIntakeResult?.files ?? [];
  const documents = input.parsedDocuments ?? [];
  const closureChecks: ClosureArchiveResult["closureChecks"] = [
    buildClosureCheck("DFM", files, documents, ["DFM关闭", "DFM关闭清单", "改图记录", "已关闭"]),
    buildClosureCheck("ECO", files, documents, ["ECO关闭", "已会签", "验证结论", "ECN", "验证通过"]),
    buildClosureCheck("测试", files, documents, ["测试报告", "复测", "已完成", "验证报告", "复测通过"]),
    buildClosureCheck("会议行动项", files, documents, ["行动项", "会议纪要", "已关闭", "责任人", "截止日期"]),
    buildClosureCheck("归档", files, documents, ["最终BOM", "最终图纸", "问题关闭", "经验总结", "归档"]),
  ];
  const highRiskOpenItems = closureChecks
    .filter((check) => check.status !== "已见关闭证据")
    .map((check) => `${check.type} 未见完整关闭证据`);

  return {
    module: "M6 Closure And Archive",
    summary: `完成 ${closureChecks.length} 类闭环检查，未见完整关闭证据 ${highRiskOpenItems.length} 类。`,
    closureChecks,
    highRiskOpenItems,
  };
}

function buildClosureCheck(
  type: ClosureArchiveResult["closureChecks"][number]["type"],
  files: NonNullable<FileIntakeResult["files"]>,
  documents: NonNullable<StructuralReviewInput["parsedDocuments"]>,
  evidenceKeywords: string[],
): ClosureArchiveResult["closureChecks"][number] {
  const fileEvidence = files
    .filter((file) => evidenceKeywords.some((keyword) => file.path.includes(keyword)))
    .map((file) => file.path);
  const documentEvidence = documents
    .filter((document) => evidenceKeywords.some((keyword) => document.text.includes(keyword) || document.filePath.includes(keyword)))
    .map((document) => document.filePath);
  const evidenceFiles = [...new Set([...fileEvidence, ...documentEvidence])];

  return {
    type,
    status: evidenceFiles.length > 0 ? "已见关闭证据" : "未见关闭证据",
    evidenceFiles,
    recommendation: evidenceFiles.length > 0
      ? `已找到 ${type} 相关证据，仍需责任人确认关闭有效性。`
      : `未找到 ${type} 关闭证据，需补充责任人、截止日期、验证结果或关闭清单。`,
  };
}
