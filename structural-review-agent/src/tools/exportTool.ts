import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { basename, join } from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun } from "docx";
import type { ExportFormat, ExportResult } from "../types.ts";

export interface ReportLike {
  summary: string;
  sections: Record<string, unknown>;
  markdownReport: string;
}

export interface ExportOptions {
  outputDir: string;
  baseName?: string;
}

export async function exportReport(
  format: ExportFormat,
  report: ReportLike,
  options: ExportOptions,
): Promise<ExportResult> {
  // 报告导出工具：
  // 支持 Markdown、Excel、Word、PDF。
  // report 参数可以是标准审查报告、DFM台账、ECO影响表或闭环检查表。
  await mkdir(options.outputDir, { recursive: true });
  const outputPath = join(options.outputDir, `${safeBaseName(options.baseName ?? "structural-review-report")}.${extensionFor(format)}`);

  try {
    if (format === "markdown") await exportMarkdown(outputPath, report);
    if (format === "excel") await exportExcel(outputPath, report);
    if (format === "word") await exportWord(outputPath, report);
    if (format === "pdf") await exportPdf(outputPath, report);

    return { format, outputPath, status: "exported" };
  } catch (error) {
    return {
      format,
      outputPath,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function exportReports(
  formats: ExportFormat[],
  report: ReportLike,
  options: ExportOptions,
): Promise<ExportResult[]> {
  return Promise.all(formats.map((format) => exportReport(format, report, options)));
}

async function exportMarkdown(outputPath: string, report: ReportLike): Promise<void> {
  await writeFile(outputPath, report.markdownReport, "utf-8");
}

async function exportExcel(outputPath: string, report: ReportLike): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "structural-review-agent";
  workbook.created = new Date();

  addRowsSheet(workbook, "报告摘要", [["字段", "内容"], ["摘要", report.summary]]);
  addRisksSheet(workbook, report);
  addDfmSheet(workbook, report);
  addEcoSheet(workbook, report);
  addQuestionsSheet(workbook, report);
  addKnowledgeSheet(workbook, report);

  await workbook.xlsx.writeFile(outputPath);
}

async function exportWord(outputPath: string, report: ReportLike): Promise<void> {
  const document = new Document({
    sections: [{
      children: report.markdownReport.split("\n").map((line) =>
        new Paragraph({
          children: [new TextRun(line || " ")],
        }),
      ),
    }],
  });
  const buffer = await Packer.toBuffer(document);
  await writeFile(outputPath, buffer);
}

async function exportPdf(outputPath: string, report: ReportLike): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const document = new PDFDocument({ margin: 40 });
    const stream = createWriteStream(outputPath);
    stream.on("finish", resolve);
    stream.on("error", reject);
    document.on("error", reject);
    document.pipe(stream);
    document.fontSize(12);
    for (const line of report.markdownReport.split("\n")) {
      document.text(line || " ", { continued: false });
    }
    document.end();
  });
}

function addRowsSheet(workbook: ExcelJS.Workbook, name: string, rows: string[][]): void {
  const worksheet = workbook.addWorksheet(name);
  worksheet.addRows(rows);
  worksheet.columns.forEach((column) => {
    column.width = 24;
  });
}

function addRisksSheet(workbook: ExcelJS.Workbook, report: ReportLike): void {
  const risks = getNestedArray(report, ["structuralRisk", "risks"]);
  const rows = [["编号", "风险等级", "风险描述", "来源", "置信度", "建议动作"]];
  for (const risk of risks) {
    rows.push([
      stringify(risk.id),
      stringify(risk.riskLevel),
      stringify(risk.description),
      stringify(risk.source),
      stringify(risk.confidence),
      stringify(risk.recommendation),
    ]);
  }
  addRowsSheet(workbook, "结构风险清单", rows);
}

function addDfmSheet(workbook: ExcelJS.Workbook, report: ReportLike): void {
  const issues = getNestedArray(report, ["dfm", "issues"]);
  const rows = [["编号", "来源文件", "问题类型", "风险等级", "状态", "需确认问题"]];
  for (const issue of issues) {
    rows.push([
      stringify(issue.id),
      stringify(issue.sourceFile),
      stringify(issue.issueType),
      stringify(issue.riskLevel),
      stringify(issue.status),
      stringify(issue.confirmationQuestion),
    ]);
  }
  addRowsSheet(workbook, "DFM台账", rows);
}

function addEcoSheet(workbook: ExcelJS.Workbook, report: ReportLike): void {
  const impacts = getNestedArray(report, ["eco", "impactAnalysis"]);
  const rows = [["影响类别", "状态", "证据", "建议"]];
  for (const impact of impacts) {
    rows.push([
      stringify(impact.category),
      stringify(impact.status),
      stringify(impact.evidence),
      stringify(impact.recommendation),
    ]);
  }
  addRowsSheet(workbook, "ECO影响表", rows);
}

function addQuestionsSheet(workbook: ExcelJS.Workbook, report: ReportLike): void {
  const questions = getNestedArray(report, ["userInteraction", "supplementalQuestions"]);
  const rows = [["补充问题", "提问原因", "影响范围"]];
  for (const question of questions) {
    rows.push([
      stringify(question.question),
      stringify(question.reason),
      stringify(question.impact),
    ]);
  }
  addRowsSheet(workbook, "补充问题表", rows);
}

function addKnowledgeSheet(workbook: ExcelJS.Workbook, report: ReportLike): void {
  const entries = getNestedArray(report, ["knowledgeCapture", "entries"]);
  const rows = [["编号", "分类", "阶段", "问题类型", "描述", "来源", "置信度", "状态"]];
  for (const entry of entries) {
    rows.push([
      stringify(entry.id),
      stringify(entry.category),
      stringify(entry.stage),
      stringify(entry.issueType),
      stringify(entry.description),
      stringify(entry.source),
      stringify(entry.confidence),
      stringify(entry.status),
    ]);
  }
  addRowsSheet(workbook, "知识沉淀表", rows);
}

function getNestedArray(report: ReportLike, path: string[]): Array<Record<string, unknown>> {
  let value: unknown = report.sections;
  for (const key of path) {
    if (!value || typeof value !== "object" || !(key in value)) return [];
    value = (value as Record<string, unknown>)[key];
  }
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
}

function extensionFor(format: ExportFormat): string {
  const map: Record<ExportFormat, string> = {
    markdown: "md",
    excel: "xlsx",
    word: "docx",
    pdf: "pdf",
  };
  return map[format];
}

function safeBaseName(value: string): string {
  return basename(value).replace(/[<>:"/\\|?*\s]+/g, "_").replace(/_+/g, "_");
}

function stringify(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return String(value);
}
