import ExcelJS from "exceljs";

/**
 * 从真实 BOM/Part list Excel 文件中提取候选零件名称/编号。
 * 返回 null 表示无法解析（非 xlsx、文件缺失或解析失败），调用方据此回退到文件名启发式。
 */
export async function parseBomPartNames(
  filePath: string,
): Promise<{ partNames: string[]; sheetName?: string } | null> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // 选择最像 Part list 的 sheet：优先名字含 part/bom/料，否则用行数最多的。
    let target: ExcelJS.Worksheet | undefined;
    let best = -1;
    workbook.eachSheet((sheet) => {
      const named = /part|bom|料|物料|清单/i.test(sheet.name);
      const score = sheet.rowCount + (named ? 100000 : 0);
      if (score > best) {
        best = score;
        target = sheet;
      }
    });
    if (!target) return null;

    // 找到"零件名/编号/图号/名称"所在列，退而求其次收集所有非空文本单元。
    const partNames = new Set<string>();
    const headerRow = target.getRow(1);
    const nameColumns: number[] = [];
    headerRow.eachCell((cell, col) => {
      const text = cellText(cell.value);
      if (/名称|零件|part|图号|编号|料号|item|name|drawing/i.test(text)) nameColumns.push(col);
    });

    target.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (nameColumns.length > 0) {
        for (const col of nameColumns) {
          const text = cellText(row.getCell(col).value).trim();
          if (isCandidatePart(text)) partNames.add(text);
        }
      } else {
        row.eachCell((cell) => {
          const text = cellText(cell.value).trim();
          if (isCandidatePart(text)) partNames.add(text);
        });
      }
    });

    if (partNames.size === 0) return null;
    return { partNames: [...partNames].slice(0, 500), sheetName: target.name };
  } catch {
    return null;
  }
}

function isCandidatePart(text: string): boolean {
  if (!text || text.length < 2 || text.length > 120) return false;
  // 过滤纯数字（数量/序号）与常见表头噪声。
  if (/^\d+(\.\d+)?$/.test(text)) return false;
  if (/^(序号|数量|单位|备注|no\.?|qty|unit|remark)$/i.test(text)) return false;
  return true;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof (value as { text?: unknown }).text === "string") return (value as { text: string }).text;
    if ("result" in value) return cellText((value as { result: ExcelJS.CellValue }).result);
    if ("richText" in value && Array.isArray((value as { richText?: unknown }).richText)) {
      return (value as { richText: Array<{ text?: string }> }).richText.map((part) => part.text ?? "").join("");
    }
  }
  return String(value);
}
