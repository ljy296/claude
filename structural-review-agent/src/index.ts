import { readdir, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { runStructuralReviewAgent } from "./agents/structuralReviewAgent.ts";
import type { ReviewMode } from "./agents/structuralReviewAgent.ts";
import { parseDocuments } from "./tools/documentTool.ts";
import { exportReports } from "./tools/exportTool.ts";
import type { ExportFormat } from "./types.ts";
import { structuralReviewRules } from "./rules/structuralRules.ts";

// 入口文件：后续可以接 CLI、HTTP API、定时任务或平台按钮。
// 当前版本支持命令行传入资料包路径，形成可运行的 M0-M6 资料包审查流程。
async function main() {
  const args = process.argv.slice(2);
  const targetPath = resolve(args[0] ?? ".");
  const reviewMode = parseReviewMode(args[1]);
  const cliOptions = parseCliOptions(args.slice(2));
  const files = await collectFiles(targetPath);
  const parsedDocuments = await parseDocuments(files);

  const result = await runStructuralReviewAgent({
    reviewMode,
    files,
    parsedDocuments,
    projectInfo: {
      sourcePath: targetPath,
    },
  });

  console.log(result.markdownReport);

  if (cliOptions.formats.length > 0) {
    const projectName = cliOptions.projectName ?? basename(targetPath);
    const folderName = cliOptions.folderName ?? inferReviewFolder(targetPath, files) ?? "全项目";
    const exportResults = await exportReports(cliOptions.formats, result, {
      outputDir: cliOptions.outputDir,
      baseName: buildReportBaseName(projectName, folderName, reviewMode, dateForFile()),
    });

    console.log("\n## 导出结果");
    for (const exportResult of exportResults) {
      console.log(`- ${exportResult.format}: ${exportResult.status} ${exportResult.outputPath}${exportResult.message ? ` (${exportResult.message})` : ""}`);
    }
  }
}

main().catch((error) => {
  console.error("结构项目评审 Agent 执行失败:", error);
  process.exitCode = 1;
});

function parseReviewMode(value: string | undefined): ReviewMode {
  const allowedModes: ReviewMode[] = ["快速审查", "完整审查", "DFM专项", "ECO专项", "归档专项", "会议准备"];
  if (value && allowedModes.includes(value as ReviewMode)) {
    return value as ReviewMode;
  }
  return "完整审查";
}

function parseCliOptions(args: string[]): {
  outputDir: string;
  formats: ExportFormat[];
  projectName?: string;
  folderName?: string;
} {
  const outputDir = valueAfter(args, "--out") ?? resolve("reports");
  const rawFormats = valueAfter(args, "--formats");
  const projectName = valueAfter(args, "--project");
  const folderName = valueAfter(args, "--folder");
  const formats = rawFormats
    ? rawFormats.split(",").map((format) => format.trim()).filter(isExportFormat)
    : [];

  return { outputDir: resolve(outputDir), formats, projectName, folderName };
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function isExportFormat(value: string): value is ExportFormat {
  return ["markdown", "excel", "word", "pdf"].includes(value);
}

async function collectFiles(path: string): Promise<string[]> {
  const pathStat = await stat(path);
  if (pathStat.isFile()) return [path];

  const entries = await readdir(path, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    return [];
  }));

  return files.flat();
}

function dateForFile(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function inferReviewFolder(targetPath: string, files: string[]): string | undefined {
  const searchText = [targetPath, ...files].join("\n");
  return structuralReviewRules.stages.find((stage) => searchText.includes(stage));
}

function buildReportBaseName(projectName: string, folderName: string, reviewMode: string, date: string): string {
  return [projectName, folderName, reviewMode, date].map(normalizeReportNamePart).join("_");
}

function normalizeReportNamePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "");
}
