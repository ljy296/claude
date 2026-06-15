import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import { structuralReviewRules } from "../rules/structuralRules.ts";
import type { ModuleResult, ParsedDocument, ProjectFile } from "../types.ts";

export interface FileIntakeResult extends ModuleResult {
  fileCount: number;
  files: ProjectFile[];
  namingIssueCount: number;
  duplicateGroups: Array<{
    key: string;
    files: string[];
  }>;
  supportedFileCount: number;
  unsupportedFiles: string[];
  parseSummary: {
    parsed: number;
    failed: number;
    unsupported: number;
  };
  parseFailures: Array<{
    filePath: string;
    message?: string;
  }>;
}

const supportedExtensions = new Set([
  "ppt",
  "pptx",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  "zip",
  "rar",
  "7z",
  "txt",
  "md",
]);

export async function runFileIntakeModule(
  input: StructuralReviewInput,
): Promise<FileIntakeResult> {
  // M1 文件接收与追溯模块：
  // 负责识别资料包中的文件夹、文件类型、命名规范、版本关系、重复文件、疑似过期文件和解析失败项。
  // 这是所有审查的第一步，必须先看资料是否齐套，再进入结构风险判断。
  const files = input.files.map(parseProjectFile);
  const duplicateGroups = findDuplicateGroups(files);
  const parsedDocuments = input.parsedDocuments ?? [];
  const parseSummary = summarizeParsedDocuments(parsedDocuments);
  const parseFailures = parsedDocuments
    .filter((document) => document.parseStatus === "failed")
    .map((document) => ({ filePath: document.filePath, message: document.message }));
  const unsupportedFiles = files
    .filter((file) => !supportedExtensions.has(file.extension.toLowerCase()))
    .map((file) => file.path);
  const namingIssueCount = files.reduce(
    (count, file) => count + file.namingIssues.length,
    0,
  );

  return {
    module: "M1 File Intake And Traceability",
    summary: `已识别 ${files.length} 个文件，命名问题 ${namingIssueCount} 项，疑似重复版本组 ${duplicateGroups.length} 组，成功解析 ${parseSummary.parsed} 个文件。`,
    fileCount: input.files.length,
    files,
    namingIssueCount,
    duplicateGroups,
    supportedFileCount: files.length - unsupportedFiles.length,
    unsupportedFiles,
    parseSummary,
    parseFailures,
  };
}

function parseProjectFile(filePath: string): ProjectFile {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const name = normalizedPath.split("/").pop() ?? normalizedPath;
  const extension = name.includes(".") ? name.split(".").pop() ?? "" : "";
  const baseName = extension ? name.slice(0, -(extension.length + 1)) : name;
  const parts = baseName.split("_").filter(Boolean);

  const parsedName = {
    projectName: parts[0],
    stage: parts[1],
    documentType: parts[2],
    version: parts[3],
    date: parts[4],
    status: parts[5],
  };

  const namingIssues: string[] = [];
  if (!parsedName.projectName) namingIssues.push("缺少项目名称");
  if (!parsedName.stage) namingIssues.push("缺少阶段字段");
  if (!parsedName.documentType) namingIssues.push("缺少资料类型");
  if (!parsedName.version || !/^(Rev[A-Z]|V\d+\.\d+)$/i.test(parsedName.version)) {
    namingIssues.push("缺少或无法识别版本号");
  }
  if (!parsedName.date || !/^\d{8}$/.test(parsedName.date)) {
    namingIssues.push("缺少或无法识别日期");
  }
  if (!parsedName.status) namingIssues.push("缺少状态字段");

  const folderStage = inferStage(normalizedPath);
  const inferredStage = inferStage(`${parsedName.stage ?? ""}_${baseName}_${normalizedPath}`);
  const inferredDocumentType = parsedName.documentType ?? inferDocumentType(baseName);

  return {
    path: filePath,
    name,
    extension,
    folderStage,
    parsedName,
    namingIssues,
    inferredStage,
    inferredDocumentType,
  };
}

function summarizeParsedDocuments(parsedDocuments: ParsedDocument[]): FileIntakeResult["parseSummary"] {
  return {
    parsed: parsedDocuments.filter((document) => document.parseStatus === "parsed").length,
    failed: parsedDocuments.filter((document) => document.parseStatus === "failed").length,
    unsupported: parsedDocuments.filter((document) => document.parseStatus === "unsupported").length,
  };
}

function inferStage(text: string): string | undefined {
  for (const [stage, keywords] of Object.entries(structuralReviewRules.stageKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return stage;
    }
  }
  return undefined;
}

function inferDocumentType(text: string): string | undefined {
  const documentKeywords = [
    "PRD",
    "结构方案",
    "初版BOM",
    "详细BOM",
    "2D图纸",
    "供应商DFM报告",
    "DFM问题清单",
    "ECO申请单",
    "ECN通知单",
    "变更前后对比",
    "验证计划",
    "测试报告",
    "会议纪要",
    "问题关闭清单",
    "设计经验总结",
  ];
  return documentKeywords.find((keyword) => text.includes(keyword));
}

function findDuplicateGroups(files: ProjectFile[]): FileIntakeResult["duplicateGroups"] {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const key = [
      file.parsedName?.projectName ?? "未知项目",
      file.inferredStage ?? file.parsedName?.stage ?? "未知阶段",
      file.inferredDocumentType ?? file.parsedName?.documentType ?? file.name,
    ].join("|");
    groups.set(key, [...(groups.get(key) ?? []), file.path]);
  }

  return [...groups.entries()]
    .filter(([, groupFiles]) => groupFiles.length > 1)
    .map(([key, groupFiles]) => ({ key, files: groupFiles }));
}
