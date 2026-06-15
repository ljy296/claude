import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import JSZip from "jszip";
import type { Confidence, ParsedDocument, ParsedTable, ParseFinding } from "../types.ts";

const maxTextLength = 80_000;

export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  // 文档解析工具：
  // 在这里接入 PPT/PDF/Word/Excel/图片 OCR 解析。
  // 解析失败时必须返回失败原因和对审查的影响，不能静默跳过。
  const fileType = extname(filePath).replace(".", "").toLowerCase() || "unknown";

  try {
    if (fileType === "docx") return buildParsedDocument(filePath, fileType, await parseDocx(filePath));
    if (fileType === "xlsx" || fileType === "xls") return buildParsedDocument(filePath, fileType, await parseWorkbook(filePath));
    if (fileType === "pdf") return buildParsedDocument(filePath, fileType, await parsePdf(filePath));
    if (fileType === "pptx") return buildParsedDocument(filePath, fileType, await parsePptx(filePath));
    if (["png", "jpg", "jpeg"].includes(fileType)) {
      if (process.env.ENABLE_OCR !== "1") {
        return {
          filePath,
          fileType,
          text: "",
          tables: [],
          findings: [],
          parseStatus: "unsupported",
          confidence: "未知",
          message: "图片 OCR 默认关闭，避免语言包下载失败中断审查；设置 ENABLE_OCR=1 后可启用。",
        };
      }
      return buildParsedDocument(filePath, fileType, await parseImage(filePath));
    }
    if (fileType === "txt" || fileType === "md") return buildParsedDocument(filePath, fileType, { text: await readFile(filePath, "utf-8"), tables: [] });

    return {
      filePath,
      fileType,
      text: "",
      tables: [],
      findings: [],
      parseStatus: "unsupported",
      confidence: "未知",
      message: `暂不支持 ${fileType} 文件解析。`,
    };
  } catch (error) {
    return {
      filePath,
      fileType,
      text: "",
      tables: [],
      findings: [],
      parseStatus: "failed",
      confidence: "未知",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function parseDocuments(filePaths: string[]): Promise<ParsedDocument[]> {
  return Promise.all(filePaths.map((filePath) => parseDocument(filePath)));
}

async function parseDocx(filePath: string): Promise<{ text: string; tables: ParsedTable[] }> {
  const result = await mammoth.extractRawText({ path: filePath });
  const messages = result.messages.map((message) => message.message).join("\n");
  return {
    text: [result.value, messages ? `解析提示：${messages}` : ""].filter(Boolean).join("\n"),
    tables: [],
  };
}

async function parseWorkbook(filePath: string): Promise<{ text: string; tables: ParsedTable[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const tables: ParsedTable[] = [];
  const textParts: string[] = [];

  workbook.eachSheet((worksheet) => {
    const rows: string[][] = [];
    worksheet.eachRow((row) => {
      const values = row.values;
      if (!Array.isArray(values)) return;
      const cells = values
        .slice(1)
        .map((value) => stringifyCell(value))
        .filter(Boolean);
      if (cells.length > 0) rows.push(cells);
    });

    if (rows.length > 0) {
      tables.push({ sheetName: worksheet.name, rows });
      textParts.push(`工作表：${worksheet.name}\n${rows.map((row) => row.join(" | ")).join("\n")}`);
    }
  });

  return { text: textParts.join("\n\n"), tables };
}

async function parsePdf(filePath: string): Promise<{ text: string; tables: ParsedTable[] }> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text, tables: [] };
  } finally {
    await parser.destroy();
  }
}

async function parsePptx(filePath: string): Promise<{ text: string; tables: ParsedTable[] }> {
  const buffer = await readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(sortSlides);
  const slideTexts = await Promise.all(slideFiles.map(async (name, index) => {
    const xml = await zip.files[name].async("text");
    return `Slide ${index + 1}\n${extractXmlText(xml)}`;
  }));

  return { text: slideTexts.join("\n\n"), tables: [] };
}

async function parseImage(filePath: string): Promise<{ text: string; tables: ParsedTable[] }> {
  const worker = await createWorker("chi_sim+eng");
  try {
    const result = await worker.recognize(filePath);
    return { text: result.data.text, tables: [] };
  } finally {
    await worker.terminate();
  }
}

function buildParsedDocument(
  filePath: string,
  fileType: string,
  parsed: { text: string; tables: ParsedTable[] },
): ParsedDocument {
  const text = normalizeText(parsed.text);

  return {
    filePath,
    fileType,
    text,
    tables: parsed.tables,
    findings: findKeywords(text),
    parseStatus: "parsed",
    confidence: text.trim().length > 0 ? "中" : "低",
    message: text.trim().length > 0 ? undefined : "文件已解析，但未提取到有效文本。",
  };
}

function stringifyCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
  if (typeof value === "object" && "result" in value) return stringifyCell(value.result);
  return String(value);
}

function normalizeText(text: string): string {
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxTextLength);
}

function extractXmlText(xml: string): string {
  const textNodes = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
    .map((match) => decodeXml(match[1] ?? ""))
    .filter(Boolean);
  return textNodes.join("\n");
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function sortSlides(a: string, b: string): number {
  const aNumber = Number(a.match(/slide(\d+)\.xml/)?.[1] ?? 0);
  const bNumber = Number(b.match(/slide(\d+)\.xml/)?.[1] ?? 0);
  return aNumber - bNumber;
}

function findKeywords(text: string): ParseFinding[] {
  const rules: Array<{ keyword: string; category: ParseFinding["category"]; confidence: Confidence }> = [
    { keyword: "PRD", category: "stage", confidence: "中" },
    { keyword: "结构方案", category: "stage", confidence: "中" },
    { keyword: "DFM", category: "dfm", confidence: "中" },
    { keyword: "ECO", category: "eco", confidence: "中" },
    { keyword: "ECN", category: "eco", confidence: "中" },
    { keyword: "清洁消毒", category: "risk", confidence: "中" },
    { keyword: "可靠性", category: "risk", confidence: "中" },
    { keyword: "法规", category: "risk", confidence: "中" },
    { keyword: "跌落", category: "risk", confidence: "中" },
    { keyword: "振动", category: "risk", confidence: "中" },
    { keyword: "已关闭", category: "closure", confidence: "中" },
    { keyword: "复测通过", category: "closure", confidence: "中" },
    { keyword: "待确认", category: "closure", confidence: "中" },
  ];

  return rules.filter((rule) => text.includes(rule.keyword));
}
