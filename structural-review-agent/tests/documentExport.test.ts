import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import JSZip from "jszip";
import { Document, Packer, Paragraph } from "docx";
import { parseDocument } from "../src/tools/documentTool.ts";
import { exportReports } from "../src/tools/exportTool.ts";
import { runStructuralReviewAgent } from "../src/agents/structuralReviewAgent.ts";

describe("document parsing and report export", () => {
  it("parses common office documents and exports reports", async () => {
    const dir = await mkdtemp(join(tmpdir(), "structural-review-"));
    try {
      const docxPath = await createDocx(dir);
      const xlsxPath = await createXlsx(dir);
      const pptxPath = await createPptx(dir);
      const pdfPath = await createPdf(dir);
      const mdPath = join(dir, "血压仪项目_DFM_DFM问题清单_RevA_20260605_评审版.md");
      await writeFile(mdPath, "DFM 问题：壁厚风险，供应商建议改图。", "utf-8");

      const parsedDocuments = await Promise.all([docxPath, xlsxPath, pptxPath, pdfPath, mdPath].map(parseDocument));
      expect(parsedDocuments.some((document) => document.parseStatus === "parsed" && document.text.includes("清洁消毒"))).toBe(true);
      expect(parsedDocuments.some((document) => document.parseStatus === "parsed" && document.text.includes("DFM"))).toBe(true);

      const result = await runStructuralReviewAgent({
        reviewMode: "完整审查",
        files: [docxPath, xlsxPath, pptxPath, pdfPath, mdPath],
        parsedDocuments,
        projectInfo: { sourcePath: dir },
      });

      const exportDir = join(dir, "reports");
      const exports = await exportReports(["markdown", "excel", "word", "pdf"], result, {
        outputDir: exportDir,
        baseName: "test-report",
      });

      expect(exports.every((item) => item.status === "exported")).toBe(true);
      expect((await readFile(join(exportDir, "test-report.md"), "utf-8")).includes("结构项目资料审查报告")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

async function createDocx(dir: string): Promise<string> {
  const filePath = join(dir, "血压仪项目_需求受付_产品定义说明_RevA_20260601_评审版.docx");
  const document = new Document({
    sections: [{
      children: [
        new Paragraph("产品定义说明：包含清洁消毒、可靠性、法规和跌落要求。"),
      ],
    }],
  });
  await writeFile(filePath, await Packer.toBuffer(document));
  return filePath;
}

async function createXlsx(dir: string): Promise<string> {
  const filePath = join(dir, "血压仪项目_ECO_ECO申请单_RevA_20260610_待会签.xlsx");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("ECO");
  worksheet.addRows([
    ["变更原因", "结构件加强"],
    ["验证计划", "跌落复测"],
    ["会签", "待确认"],
  ]);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

async function createPptx(dir: string): Promise<string> {
  const filePath = join(dir, "血压仪项目_结构方案_结构方案说明_RevA_20260603_评审版.pptx");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
  zip.file("ppt/slides/slide1.xml", "<p:sld><a:t>结构方案 PPT，包含关键截面和初版BOM</a:t></p:sld>");
  await writeFile(filePath, await zip.generateAsync({ type: "nodebuffer" }));
  return filePath;
}

async function createPdf(dir: string): Promise<string> {
  const filePath = join(dir, "血压仪项目_DVT_测试报告_RevA_20260615_已完成.pdf");
  await new Promise<void>((resolve, reject) => {
    const document = new PDFDocument();
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", async () => {
      await writeFile(filePath, Buffer.concat(chunks));
      resolve();
    });
    document.on("error", reject);
    document.text("DVT test report: retest passed and issue closed.");
    document.end();
  });
  return filePath;
}
