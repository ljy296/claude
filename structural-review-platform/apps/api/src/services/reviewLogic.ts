import {
  getModulesByFolder,
  type ReviewModuleConfig,
  type EvidenceTrace,
} from "../../../../packages/review-core/src/projectStructure";
import type {
  AiQaEvidenceSource,
  AiQaRecord,
  BomDrawingCheckResult,
  CrossModuleConflictRecord,
  MaterialObjectRecord,
  ModuleInterpretationRecord,
  ProjectFolderRecord,
  ProjectRecord,
  RelationGraph,
  RelationNode,
  RelationEdge,
  ReviewJobRecord,
  ReviewModuleRecord,
  ReviewReportRecord,
} from "./types";

export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function inferMaterialVersion(name: string): string {
  return name.match(/(?:Rev[A-Z0-9]+|V\d+(?:\.\d+)*|版本[\w.-]+)/i)?.[0] ?? "未知";
}

export function incrementVersionTag(current: string): string {
  const revMatch = current.match(/^Rev([A-Z])$/i);
  if (revMatch) {
    const next = String.fromCharCode(revMatch[1].toUpperCase().charCodeAt(0) + 1);
    return `Rev${next}`;
  }
  const vMatch = current.match(/^V(\d+)(?:\.(\d+))?/i);
  if (vMatch) {
    const major = parseInt(vMatch[1], 10);
    return `V${major + 1}`;
  }
  return `${current}_new`;
}

export function normalizeModuleCodes(folderCode: string, moduleCodes: string[] | undefined): string[] {
  const allowedModules = getModulesByFolder(folderCode);
  const allowedCodes = new Set(allowedModules.map((moduleConfig) => moduleConfig.code));
  const normalized = (moduleCodes ?? []).filter((moduleCode) => allowedCodes.has(moduleCode));
  if (normalized.length > 0) return Array.from(new Set(normalized));
  return allowedModules[0] ? [allowedModules[0].code] : [];
}

export function getModuleStatus(
  moduleConfig: ReviewModuleConfig,
  moduleMaterials: MaterialObjectRecord[],
  moduleInterpretations: ModuleInterpretationRecord[],
): ReviewModuleRecord["status"] {
  const latest = moduleInterpretations[0];
  if (latest?.status === "人工已确认") return "人工已确认";
  if (latest?.blocksStage || latest?.status === "需补充/有风险") return "需补充/有风险";
  if (latest) return "已解读";
  if (moduleMaterials.length > 0) return "已上传";
  return "未上传";
}

// ---------------------------------------------------------------------------
// 字符串相似度：改用归一化编辑距离（Levenshtein），避免旧实现把异位词判为 100%。
// ---------------------------------------------------------------------------
export function normalizeName(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "").replace(/\s/g, "").toLowerCase();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** 归一化相似度 0-1（1 表示完全一致）。基于编辑距离。 */
export function stringSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export function extractEngineeringNames(name: string): string[] {
  const base = name.replace(/\.[^.]+$/, "");
  const tokens = base.split(/[_\-\s（）()【】\[\]]+/).filter((token) => token.length >= 2);
  return tokens
    .filter((token) => !/^(MED|Rev|V\d|2D|3D|BOM|Part|list|图纸|详细设计)$/i.test(token))
    .slice(0, 12);
}

// ---------------------------------------------------------------------------
// 模块准入 / 风险 / 建议
// ---------------------------------------------------------------------------
export function evaluateAdmission(moduleConfig: ReviewModuleConfig, moduleMaterials: MaterialObjectRecord[]) {
  const evidenceText = moduleMaterials.map((material) => material.name).join("\n");
  const missingConditions = moduleConfig.minimumReviewConditions.filter(
    (condition) => !conditionSatisfied(condition, evidenceText, moduleMaterials),
  );
  const passed = moduleMaterials.length > 0 && missingConditions.length === 0;
  return {
    passed,
    missingConditions,
    conclusion: passed
      ? "满足最低可审查条件，可以形成初步工程判断，但仍需人工确认。"
      : `资料不足，无法形成可靠的${moduleConfig.name}风险判断。`,
  };
}

function conditionSatisfied(condition: string, evidenceText: string, moduleMaterials: MaterialObjectRecord[]): boolean {
  if (condition.includes("至少上传") || condition.includes("有资料")) return moduleMaterials.length > 0;
  if (condition.includes("测试项目")) return /测试|跌落|振动|寿命|环境|包装|可靠性|验证/i.test(evidenceText);
  if (condition.includes("判定标准") || condition.includes("验收准则")) return /标准|判定|准则|规格|要求|pass|fail|合格/i.test(evidenceText);
  if (condition.includes("适用场景") || condition.includes("使用环境")) return /场景|环境|使用|运输|包装|跌落/i.test(evidenceText);
  if (condition.includes("2D") || condition.includes("3D") || condition.includes("STEP") || condition.includes("PRT")) return /2D|3D|STEP|PRT|图纸|drawing/i.test(evidenceText);
  if (condition.includes("BOM") || condition.includes("零件")) return /BOM|Part|零件|物料|料号/i.test(evidenceText);
  if (condition.includes("版本")) return /Rev|V\d|版本|版|ver/i.test(evidenceText);
  if (condition.includes("变更")) return /ECO|ECN|变更|change/i.test(evidenceText);
  if (condition.includes("会签") || condition.includes("审批")) return /会签|审批|批准|sign|approve/i.test(evidenceText);
  if (condition.includes("原因分析")) return /原因|root|cause|分析/i.test(evidenceText);
  return moduleMaterials.length > 0 && moduleConfigKeywordHit(condition, evidenceText);
}

function moduleConfigKeywordHit(condition: string, evidenceText: string): boolean {
  return condition.split(/[、/ ]/).some((part) => part.length >= 2 && evidenceText.includes(part));
}

export function buildDeepRisks(
  moduleConfig: ReviewModuleConfig,
  moduleMaterials: MaterialObjectRecord[],
  admissionResult: { passed: boolean; missingConditions: string[]; conclusion: string },
): string[] {
  if (!admissionResult.passed) {
    return [
      admissionResult.conclusion,
      `未满足最低可审查条件：${admissionResult.missingConditions.join("、") || "缺少有效资料对象"}`,
      ...moduleConfig.commonRisks.slice(0, 2),
    ];
  }
  return [
    `${moduleConfig.name}已具备初步解读条件，但需继续核对资料版本和适用范围。`,
    ...moduleConfig.commonRisks.slice(0, 2),
    `当前判断基于 ${moduleMaterials.length} 个资料对象，正式结论需保留证据链并经人工确认。`,
  ];
}

export function buildSuggestedActions(moduleConfig: ReviewModuleConfig, missingItems: string[]): string[] {
  if (missingItems.length > 0) {
    return [
      `补充最低可审查条件：${missingItems.join("、")}`,
      `推荐补充资料：${moduleConfig.recommendedMaterials.join("、")}`,
      "补充后重新执行模块深度解读。",
    ];
  }
  return [
    "核对资料版本、适用范围和来源可信度。",
    "由结构工程师执行人工确认。",
    "将模块解读结果纳入阶段级审查和M0-M9综合审查。",
  ];
}

export function buildEvidenceChain(
  projectId: string,
  folderCode: string,
  moduleCode: string,
  moduleMaterials: MaterialObjectRecord[],
  sourceType: EvidenceTrace["sourceType"],
): EvidenceTrace[] {
  if (moduleMaterials.length === 0) {
    return [{ projectId, folderCode, moduleCode, sourceType: "未知", excerpt: "未识别到资料对象" }];
  }
  return moduleMaterials.map((material) => ({
    projectId,
    folderCode,
    moduleCode,
    materialObjectId: material.id,
    materialName: material.name,
    materialVersion: inferMaterialVersion(material.name),
    sourceType,
    excerpt: material.name,
  }));
}

// ---------------------------------------------------------------------------
// 缺失项提示（纯计算，不再写库）
// ---------------------------------------------------------------------------
export function buildMissingHints(
  folder: ProjectFolderRecord,
  activeMaterials: MaterialObjectRecord[],
  moduleRows: ReviewModuleRecord[] = [],
): string[] {
  const names = activeMaterials.map((material) => material.name).join("\n");
  const hints: string[] = [];

  if (activeMaterials.length === 0) {
    hints.push("当前分类未上传资料，请先上传文件、文件夹、压缩包或批量文件。");
  }

  for (const moduleRow of moduleRows) {
    if (moduleRow.required && moduleRow.materialCount === 0) {
      hints.push(`必传模块「${moduleRow.name}」尚未上传资料，建议补充：${moduleRow.recommendedMaterials.join("、")}。`);
    }
    if (moduleRow.required && moduleRow.status !== "人工已确认" && moduleRow.affectsStageGate) {
      hints.push(`模块「${moduleRow.name}」尚未人工确认，不能自动视为阶段通过依据。`);
    }
  }

  if (folder.code === "MED_001" && !/PRD|需求|可靠性|法规|清洁|消毒/i.test(names)) {
    hints.push("需求受付建议补充 PRD、用户需求、可靠性、法规或清洁消毒要求。");
  }
  if (folder.code === "MED_004" && !/2D|图纸|BOM|Part|DFM|公差/i.test(names)) {
    hints.push("详细设计建议补充 2D图纸、详细BOM/Part list、关键尺寸、公差或DFM资料。");
  }
  if (folder.code === "MED_005_007_01" && !/ECO|ECN|变更|验证|会签/i.test(names)) {
    hints.push("ECN分类建议补充 ECO/ECN申请、变更前后对比、影响分析、验证计划和会签记录。");
  }
  if (folder.code === "MED_005_007_02" && !/测试|跌落|振动|寿命|复测|验证/i.test(names)) {
    hints.push("测试报告分类建议补充结构相关测试报告、失败项、原因分析和复测结论。");
  }

  if (hints.length === 0) {
    hints.push("当前分类未发现明显缺失项，可继续发起审查；最终结论仍需结构工程师确认。");
  }
  return hints;
}

// ---------------------------------------------------------------------------
// 报告 Markdown
// ---------------------------------------------------------------------------
export function buildReviewMarkdown(
  project: ProjectRecord,
  folder: ProjectFolderRecord | undefined,
  job: ReviewJobRecord,
  activeMaterials: MaterialObjectRecord[],
  moduleRows: ReviewModuleRecord[] = [],
  conflicts: CrossModuleConflictRecord[] = [],
): string {
  const materialLines = activeMaterials.length > 0
    ? activeMaterials.map((material) => `- ${material.name}（${material.type}）`).join("\n")
    : "- 当前分类暂无资料对象";
  const moduleLines = moduleRows.length > 0
    ? moduleRows.map((moduleRow) => `- ${moduleRow.name}: ${moduleRow.status}，资料 ${moduleRow.materialCount}，解读 ${moduleRow.interpretationCount}，${moduleRow.affectsStageGate ? "影响阶段准入" : "不直接阻塞阶段"}`).join("\n")
    : "- 当前无模块配置";
  const conflictLines = conflicts.length > 0
    ? conflicts.map((conflict) => `- [${conflict.severity}] ${conflict.title}: ${conflict.description}`).join("\n")
    : "- 暂未发现跨模块冲突。";

  return [
    `# ${job.reportBaseName}`,
    "",
    `- 项目：${project.name}`,
    `- 审查文件夹：${folder?.name ?? "全项目"}`,
    `- 审查类型：${job.reviewType}`,
    `- 审查时间：${job.createdAt}`,
    "",
    "## 资料对象",
    "",
    materialLines,
    "",
    "## 第一层：模块级摘要",
    "",
    moduleLines,
    "",
    "## 第二层：M0-M9 综合结论",
    "",
    activeMaterials.length > 0
      ? "当前分类已有资料对象和模块级中间结论。M0-M9 总审查应优先消费模块解读结果，再形成正式风险、DFM、ECO、测试闭环、阶段准入和归档建议。"
      : "当前分类暂无资料，无法形成有效审查结论。",
    "",
    "## 跨模块冲突检查",
    "",
    conflictLines,
  ].join("\n");
}

export function buildModuleMarkdown(
  project: ProjectRecord,
  folder: ProjectFolderRecord,
  interpretation: ModuleInterpretationRecord,
): string {
  return [
    `# ${project.name}_${folder.name}_${interpretation.moduleName}_模块深度解读`,
    "",
    `- 模块名称：${interpretation.moduleName}`,
    `- 资料状态：${interpretation.materialStatus}`,
    `- 置信度：${interpretation.confidence}`,
    `- 是否阻塞当前阶段：${interpretation.blocksStage ? "是" : "否"}`,
    `- 信息来源：${interpretation.sourceType}`,
    `- 准入结论：${interpretation.admissionResult.conclusion}`,
    "",
    "## 已识别资料",
    interpretation.recognizedMaterials.length > 0 ? interpretation.recognizedMaterials.map((item) => `- ${item}`).join("\n") : "- 未识别到资料",
    "",
    "## 核心内容摘要",
    interpretation.coreSummary,
    "",
    "## 结构相关判断",
    interpretation.structuralJudgment,
    "",
    "## 风险点",
    interpretation.risks.map((item) => `- ${item}`).join("\n"),
    "",
    "## 缺失项",
    interpretation.missingItems.length > 0 ? interpretation.missingItems.map((item) => `- ${item}`).join("\n") : "- 暂无明显缺失项",
    "",
    "## 需确认问题",
    interpretation.confirmationQuestions.map((item) => `- ${item}`).join("\n"),
    "",
    "## 建议动作",
    interpretation.suggestedActions.map((item) => `- ${item}`).join("\n"),
    "",
    "## 证据链",
    interpretation.evidenceChain.map((evidence) => `- 项目:${evidence.projectId} / 阶段:${evidence.folderCode} / 模块:${evidence.moduleCode} / 资料:${evidence.materialName ?? "未知"} / 版本:${evidence.materialVersion ?? "未知"} / 解读:${evidence.interpretationId ?? interpretation.id} / 来源:${evidence.sourceType}`).join("\n"),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// BOM / 图纸专项对应检查
// 当提供 parsedBomPartNames（真实解析出的 BOM 条目）时，用真实内容比对；
// 否则退回文件名 token 启发式，并把 sheetIsAutoDetected 标为 true。
// ---------------------------------------------------------------------------
export function runBomDrawingCheckLogic(
  projectId: string,
  folderCode: string,
  folderMaterials: MaterialObjectRecord[],
  parsedBom: { partNames: string[]; sheetName?: string } | null,
): BomDrawingCheckResult {
  const now = new Date().toISOString();

  const drawing2dFiles = folderMaterials.filter((material) =>
    /HA1_DE|HA1_CB/i.test(material.name) && /2D|dwg|dxf|pdf/i.test(material.name),
  );
  const drawing3dFiles = folderMaterials.filter((material) =>
    /HA1_DE|HA1_CB/i.test(material.name) && /3D|stp|step|sldprt|prt|iges|igs/i.test(material.name),
  );
  const bomFiles = folderMaterials.filter((material) =>
    /BOM|Part.?list|料单|物料/i.test(material.name) && /xlsx|xls|csv/i.test(material.name),
  );

  const prefixes = new Set<string>();
  for (const file of [...drawing2dFiles, ...drawing3dFiles]) {
    const match = file.name.match(/^(HA1_[A-Z]{2,})/i);
    if (match) prefixes.add(match[1].toUpperCase());
  }
  const checkedPrefix = prefixes.size > 0 ? [...prefixes].join(" / ") : "HA1_DE";

  const hasRealBom = !!parsedBom && parsedBom.partNames.length > 0;
  let usedSheet = parsedBom?.sheetName ?? (checkedPrefix.split(" / ")[0] ?? "HA1_DE");
  let sheetIsAutoDetected = !hasRealBom;

  const drawing2dNames = new Map(drawing2dFiles.map((file) => [normalizeName(file.name), file.name]));
  const drawing3dNames = new Map(drawing3dFiles.map((file) => [normalizeName(file.name), file.name]));

  const bomRegistered2d = new Map<string, string>();
  const bomRegistered3d = new Map<string, string>();

  if (hasRealBom) {
    // 真实解析出的 BOM 条目：作为登记名，2D/3D 共用（BOM 通常不分 2D/3D 行）。
    for (const partName of parsedBom!.partNames) {
      const key = normalizeName(partName);
      if (!key) continue;
      bomRegistered2d.set(key, partName);
      bomRegistered3d.set(key, partName);
    }
  } else {
    // 文件名 token 启发式回退。
    for (const bomFile of bomFiles) {
      const tokens = extractEngineeringNames(bomFile.name);
      for (const token of tokens) {
        if (/2D|dwg|dxf/i.test(token)) bomRegistered2d.set(normalizeName(token), token);
        if (/3D|stp|step|sldprt/i.test(token)) bomRegistered3d.set(normalizeName(token), token);
      }
      if (/HA1_DE|HA1_CB/i.test(bomFile.name)) {
        const baseToken = bomFile.name.replace(/\.[^.]+$/, "");
        bomRegistered2d.set(normalizeName(baseToken), baseToken);
        bomRegistered3d.set(normalizeName(baseToken), baseToken);
      }
    }
    if (bomFiles.length > 0) {
      usedSheet = "Part list (自动识别)";
      sheetIsAutoDetected = true;
    }
  }

  const bomOnly2d = [...bomRegistered2d.keys()].filter((name) => !drawing2dNames.has(name));
  const bomOnly3d = [...bomRegistered3d.keys()].filter((name) => !drawing3dNames.has(name));
  const bomOnlyItems = [...bomOnly2d.map((n) => `[2D] ${bomRegistered2d.get(n)}`), ...bomOnly3d.map((n) => `[3D] ${bomRegistered3d.get(n)}`)];

  const drawingOnly2d = [...drawing2dNames.keys()].filter((name) => !bomRegistered2d.has(name));
  const drawingOnly3d = [...drawing3dNames.keys()].filter((name) => !bomRegistered3d.has(name));
  const drawingOnlyItems = [...drawingOnly2d.map((n) => `[2D] ${drawing2dNames.get(n)}`), ...drawingOnly3d.map((n) => `[3D] ${drawing3dNames.get(n)}`)];

  const fuzzyMatches: BomDrawingCheckResult["fuzzyMatches"] = [];
  for (const [dNorm, dOrig] of drawing2dNames) {
    for (const [bNorm, bOrig] of bomRegistered2d) {
      if (dNorm !== bNorm) {
        const sim = stringSimilarity(dNorm, bNorm);
        if (sim >= 0.6 && sim < 1) fuzzyMatches.push({ drawing: dOrig, bom: bOrig, similarity: Math.round(sim * 100) / 100 });
      }
    }
  }

  const versionConflicts: BomDrawingCheckResult["versionConflicts"] = [];
  for (const [dNorm, dOrig] of drawing2dNames) {
    const match = bomRegistered2d.get(dNorm);
    if (match) {
      const drawingVersion = inferMaterialVersion(dOrig);
      const bomVersion = inferMaterialVersion(match);
      if (drawingVersion !== "未知" && bomVersion !== "未知" && drawingVersion !== bomVersion) {
        versionConflicts.push({ name: dOrig, drawingVersion, bomVersion });
      }
    }
  }

  const tripleGaps: string[] = [];
  if (drawing2dFiles.length === 0 && drawing3dFiles.length > 0) tripleGaps.push("已有3D图纸，但缺少对应2D图纸");
  if (drawing3dFiles.length === 0 && drawing2dFiles.length > 0) tripleGaps.push("已有2D图纸，但缺少对应3D图纸");
  if (bomFiles.length === 0 && (drawing2dFiles.length > 0 || drawing3dFiles.length > 0)) tripleGaps.push("已有图纸文件，但缺少BOM/Part list");

  const namingIssues: string[] = [];
  for (const [dNorm, dOrig] of drawing2dNames) {
    const dup3d = [...drawing3dNames.keys()].find((n) => stringSimilarity(n, dNorm) >= 0.85 && n !== dNorm);
    if (dup3d) namingIssues.push(`2D"${dOrig}"与3D"${drawing3dNames.get(dup3d)}"命名相似但不一致，疑似同一零件`);
  }

  const suggestions: string[] = [];
  if (!hasRealBom && bomFiles.length > 0) suggestions.push("未能解析 BOM 文件内容，本次基于文件名启发式判断，建议确认 BOM 文件格式（xlsx）或人工复核。");
  if (bomOnlyItems.length > 0) suggestions.push(`补充上传 BOM 中登记但未上传的图纸：${bomOnlyItems.slice(0, 4).join("、")}`);
  if (drawingOnlyItems.length > 0) suggestions.push(`将已上传图纸补录到 BOM：${drawingOnlyItems.slice(0, 4).join("、")}`);
  if (fuzzyMatches.length > 0) suggestions.push("确认名称相似项是否为同一零件，建议统一命名规范");
  if (versionConflicts.length > 0) suggestions.push("核查版本号冲突项，确认图纸版本与BOM版本一致");
  if (tripleGaps.length > 0) suggestions.push(...tripleGaps.map((gap) => `补充${gap}`));
  if (namingIssues.length > 0) suggestions.push("修改命名不规范项，建议统一使用 HA1_DE_零件号_版本 格式");
  if (suggestions.length === 0) suggestions.push("未发现明显冲突，建议人工逐项核查版本和材料一致性");

  return {
    id: createId("bom_check"),
    projectId,
    folderCode,
    checkedPrefix,
    bomOnlyItems,
    drawingOnlyItems,
    fuzzyMatches,
    versionConflicts,
    tripleGaps,
    namingIssues,
    suggestions,
    usedSheet,
    sheetIsAutoDetected,
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// 关联关系视图
// ---------------------------------------------------------------------------
export function buildRelationGraphLogic(
  _projectId: string,
  _folderCode: string,
  folderMaterials: MaterialObjectRecord[],
): RelationGraph {
  const nodes: RelationNode[] = [];
  const edges: RelationEdge[] = [];

  const bomFiles = folderMaterials.filter((material) => /BOM|Part.?list/i.test(material.name));
  const drawing2dFiles = folderMaterials.filter((material) => /2D|dwg|dxf/i.test(material.name));
  const drawing3dFiles = folderMaterials.filter((material) => /3D|stp|step|sldprt/i.test(material.name));
  const ecoFiles = folderMaterials.filter((material) => /ECO|ECN|变更/i.test(material.name));
  const testFiles = folderMaterials.filter((material) => /测试|跌落|振动|寿命|Test/i.test(material.name));
  const troubleFiles = folderMaterials.filter((material) => /Trouble|问题清单|缺陷|fail/i.test(material.name));

  for (const bom of bomFiles) {
    const bomNodeId = `bom_${bom.id}`;
    nodes.push({ id: bomNodeId, type: "bom", label: bom.name, materialId: bom.id });
    for (const d2 of drawing2dFiles) {
      const d2NodeId = `drawing2d_${d2.id}`;
      if (!nodes.find((n) => n.id === d2NodeId)) nodes.push({ id: d2NodeId, type: "drawing2d", label: d2.name, materialId: d2.id });
      edges.push({ from: bomNodeId, to: d2NodeId, label: "2D图纸" });
      for (const d3 of drawing3dFiles) {
        const d3NodeId = `drawing3d_${d3.id}`;
        if (!nodes.find((n) => n.id === d3NodeId)) nodes.push({ id: d3NodeId, type: "drawing3d", label: d3.name, materialId: d3.id });
        if (!edges.find((e) => e.from === d2NodeId && e.to === d3NodeId)) edges.push({ from: d2NodeId, to: d3NodeId, label: "对应3D" });
      }
    }
  }

  for (const d3 of drawing3dFiles) {
    const d3NodeId = `drawing3d_${d3.id}`;
    for (const eco of ecoFiles) {
      const ecoNodeId = `eco_${eco.id}`;
      if (!nodes.find((n) => n.id === ecoNodeId)) nodes.push({ id: ecoNodeId, type: "eco", label: eco.name, materialId: eco.id });
      edges.push({ from: d3NodeId, to: ecoNodeId, label: "ECO变更" });
    }
  }

  for (const eco of ecoFiles) {
    const ecoNodeId = `eco_${eco.id}`;
    for (const test of testFiles) {
      const testNodeId = `test_${test.id}`;
      if (!nodes.find((n) => n.id === testNodeId)) nodes.push({ id: testNodeId, type: "testIssue", label: test.name, materialId: test.id });
      edges.push({ from: ecoNodeId, to: testNodeId, label: "验证测试" });
    }
  }

  for (const test of testFiles) {
    const testNodeId = `test_${test.id}`;
    for (const trouble of troubleFiles) {
      const troubleNodeId = `trouble_${trouble.id}`;
      if (!nodes.find((n) => n.id === troubleNodeId)) nodes.push({ id: troubleNodeId, type: "troubleList", label: trouble.name, materialId: trouble.id });
      edges.push({ from: testNodeId, to: troubleNodeId, label: "问题记录" });
    }
  }

  for (const material of folderMaterials) {
    const allMaterialIds = nodes.filter((n) => n.materialId).map((n) => n.materialId);
    if (!allMaterialIds.includes(material.id)) {
      nodes.push({ id: `other_${material.id}`, type: "material", label: material.name, materialId: material.id });
    }
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// 规则版 AI 问答（作为无 LLM 时的降级实现，接收已聚合的数据，纯函数）
// ---------------------------------------------------------------------------
export function buildRuleBasedAiQa(input: {
  scope: "project" | "global";
  projectId?: string;
  question: string;
  projectMaterials: MaterialObjectRecord[];
  projectInterpretations: ModuleInterpretationRecord[];
  projectReports: ReviewReportRecord[];
  allProjects: ProjectRecord[];
  allInterpretations: ModuleInterpretationRecord[];
  allMaterials: MaterialObjectRecord[];
}): { answer: string; judgability: AiQaRecord["judgability"]; evidenceSources: AiQaEvidenceSource[] } {
  const evidenceSources: AiQaEvidenceSource[] = [];
  let answer = "";
  let judgability: AiQaRecord["judgability"] = "资料不足";
  const q = input.question.toLowerCase();

  if (input.scope === "project" && input.projectId) {
    const { projectMaterials, projectInterpretations, projectReports } = input;
    evidenceSources.push(...projectMaterials.slice(0, 5).map((material): AiQaEvidenceSource => ({
      type: "material", id: material.id, label: material.name, folderCode: material.folderCode, timestamp: material.createdAt,
    })));
    evidenceSources.push(...projectInterpretations.slice(0, 3).map((interp): AiQaEvidenceSource => ({
      type: "interpretation", id: interp.id, label: `${interp.moduleName}解读`, folderCode: interp.folderCode, moduleCode: interp.moduleCode, timestamp: interp.createdAt,
    })));

    if (projectMaterials.length === 0) {
      answer = "当前项目尚未上传资料，无法形成基于资料的可靠判断。建议先上传相关资料并完成模块解读后再进行问答。";
      judgability = "资料不足";
    } else if (q.includes("风险") || q.includes("问题")) {
      const risks = projectInterpretations.flatMap((interp) => interp.risks).slice(0, 6);
      answer = risks.length > 0
        ? `基于当前已上传的 ${projectMaterials.length} 个资料对象和 ${projectInterpretations.length} 次模块解读，识别到以下潜在风险：\n${risks.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\n以上结论仅供参考，最终判断需由结构工程师人工确认。`
        : `当前共有 ${projectMaterials.length} 个资料对象，但尚未执行模块深度解读，无法识别具体风险。建议先对各模块执行解读。`;
      judgability = risks.length > 0 ? "部分可判断" : "资料不足";
    } else if (q.includes("缺失") || q.includes("缺少")) {
      const missing = projectInterpretations.flatMap((interp) => interp.missingItems).slice(0, 5);
      answer = missing.length > 0
        ? `基于模块解读结果，当前项目识别到以下缺失项：\n${missing.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\n注意：AI 无法自动补全缺失资料，须由项目组确认和补充。`
        : "当前模块解读未发现明显缺失项，但结论不代表全部充分，仍需人工审阅。";
      judgability = "部分可判断";
    } else if (q.includes("报告") || q.includes("结论")) {
      answer = projectReports.length > 0
        ? `当前项目已生成 ${projectReports.length} 份报告。最新报告名称：${projectReports[0].baseName}。详细结论请查看对应报告内容。`
        : "当前项目尚未生成报告，请先执行模块解读或阶段审查。";
      judgability = projectReports.length > 0 ? "可判断" : "资料不足";
    } else {
      answer = `基于当前项目 ${projectMaterials.length} 个资料对象和 ${projectInterpretations.length} 条解读记录，AI 无法直接回答"${input.question.slice(0, 50)}"，需要结构工程师结合具体资料判断。`;
      judgability = "资料不足";
    }
  } else {
    const { allProjects, allInterpretations, allMaterials } = input;
    evidenceSources.push(...allProjects.slice(0, 3).map((project): AiQaEvidenceSource => ({
      type: "project", id: project.id, label: project.name, timestamp: project.createdAt,
    })));

    if (allProjects.length === 0) {
      answer = "资料库中尚无已归档项目，无法基于历史案例回答。请先完成至少一个项目并归档。";
      judgability = "资料不足";
    } else if (q.includes("dfm") || q.includes("制造")) {
      const dfmInterpretations = allInterpretations.filter((interp) => interp.moduleCode.includes("dfm") || interp.moduleName.includes("DFM"));
      answer = dfmInterpretations.length > 0
        ? `资料库中共有 ${dfmInterpretations.length} 条 DFM 相关解读记录，来自 ${allProjects.length} 个项目。常见 DFM 风险包括：${dfmInterpretations.flatMap((interp) => interp.risks).slice(0, 4).join("、")}。`
        : `资料库中共有 ${allProjects.length} 个项目、${allMaterials.length} 个资料对象，但尚无 DFM 专项解读记录。`;
      judgability = dfmInterpretations.length > 0 ? "部分可判断" : "资料不足";
    } else if (q.includes("eco") || q.includes("变更")) {
      const ecoInterpretations = allInterpretations.filter((interp) => interp.folderCode.includes("ECN") || interp.moduleName.includes("ECO"));
      answer = ecoInterpretations.length > 0
        ? `资料库中共有 ${ecoInterpretations.length} 条 ECO/ECN 解读记录。常见 ECO 风险：${ecoInterpretations.flatMap((interp) => interp.risks).slice(0, 4).join("、")}。`
        : `资料库中尚无 ECO/ECN 专项解读，无法形成历史经验总结。`;
      judgability = ecoInterpretations.length > 0 ? "部分可判断" : "资料不足";
    } else {
      answer = `资料库中共有 ${allProjects.length} 个归档项目、${allMaterials.length} 个资料对象。AI 无法直接回答"${input.question.slice(0, 50)}"，请提供更具体的关键词（如：DFM、ECO、测试失败、可靠性）以便检索相关历史案例。`;
      judgability = "资料不足";
    }
  }

  return { answer, judgability, evidenceSources };
}

/** 跨模块冲突检查（纯计算）。 */
export function checkCrossModuleConflictsLogic(
  projectId: string,
  folderCode: string,
  folderMaterials: MaterialObjectRecord[],
): CrossModuleConflictRecord[] {
  const namesByModule = (moduleCode: string) => folderMaterials
    .filter((material) => material.moduleCodes.includes(moduleCode))
    .flatMap((material) => extractEngineeringNames(material.name));

  const conflicts: CrossModuleConflictRecord[] = [];
  if (folderCode === "MED_004") {
    const drawingNames = new Set([...namesByModule("drawing-package"), ...namesByModule("critical-dimensions")]);
    const bomNames = new Set(namesByModule("bom-part-list"));
    const drawingOnly = [...drawingNames].filter((name) => !bomNames.has(name));
    const bomOnly = [...bomNames].filter((name) => !drawingNames.has(name));
    if (drawingNames.size > 0 && bomNames.size > 0 && (drawingOnly.length > 0 || bomOnly.length > 0)) {
      conflicts.push({
        id: createId("conflict"),
        projectId,
        folderCode,
        severity: "中",
        title: "2D/3D图纸与BOM/Part list名称对应疑似不一致",
        description: `图纸侧未在BOM中匹配：${drawingOnly.slice(0, 8).join("、") || "无"}；BOM侧未在图纸中匹配：${bomOnly.slice(0, 8).join("、") || "无"}。`,
        relatedModules: ["drawing-package", "critical-dimensions", "bom-part-list"],
        relatedMaterials: folderMaterials.map((material) => material.name),
        suggestion: "建议核对2D、3D、BOM/Part list的零件名称、编号、版本和材料，确认是否存在漏图、漏BOM、旧版本或命名不一致。",
        evidenceChain: buildEvidenceChain(projectId, folderCode, "cross-module-conflict", folderMaterials, "上下文推断"),
        createdAt: new Date().toISOString(),
      });
    }
  }
  return conflicts;
}
