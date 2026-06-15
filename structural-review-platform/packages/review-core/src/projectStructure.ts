export const fixedProjectFolders = [
  { code: "MED_000", name: "MED_000_项目基础信息", description: "项目基本信息、产品定义、项目计划、产品型号/版本说明" },
  { code: "MED_001", name: "MED_001_需求受付", description: "PRD、需求、可靠性、法规、清洁消毒和需求评审记录" },
  { code: "MED_002", name: "MED_002_ID设计", description: "ID效果图、三视图、外观尺寸、CMF、ID评审记录" },
  { code: "MED_003", name: "MED_003_结构方案", description: "结构方案、爆炸图、关键截面、初版BOM和结构风险" },
  { code: "MED_004", name: "MED_004_详细设计", description: "2D/3D资料、详细BOM、Part list、关键尺寸、公差和DFM资料" },
  { code: "MED_005_007_00", name: "MED_005&007_00_试产", description: "EVT/DVT/PVT试产、阶段评审和试产问题闭环" },
  { code: "MED_005_007_01", name: "MED_005&007_01_ECN", description: "ECO/ECN、变更影响、验证计划和会签记录" },
  { code: "MED_005_007_02", name: "MED_005&007_02_测试报告", description: "跌落、振动、寿命、清洁消毒和包装运输等测试报告" },
  { code: "MED_009", name: "MED_009_量产承认", description: "量产承认、最终BOM、最终图纸、检验标准和放行记录" },
  { code: "TROUBLE_LIST", name: "Trouble list", description: "项目问题清单、DFM问题、测试失败项、会议行动项和关闭证据" },
  { code: "OTHER", name: "其他", description: "无法自动归类、临时补充或需人工分类资料" },
] as const;

export type FixedProjectFolderCode = (typeof fixedProjectFolders)[number]["code"];
export type FixedProjectFolderName = (typeof fixedProjectFolders)[number]["name"];

export const folderStatuses = ["未上传", "已上传", "待审查", "审查中", "已出报告", "需补充"] as const;
export type FolderStatus = (typeof folderStatuses)[number];

export const folderActions = ["上传文件/文件夹", "查看资料", "开始审查", "历史报告", "缺失项提示"] as const;
export type FolderAction = (typeof folderActions)[number];

export const materialObjectTypes = ["单文件", "文件夹", "压缩包", "批量文件"] as const;
export type MaterialObjectType = (typeof materialObjectTypes)[number];

export const materialDeleteActions = ["从本次审查移除", "从分类文件夹删除", "彻底删除"] as const;
export type MaterialDeleteAction = (typeof materialDeleteActions)[number];

export const moduleStatuses = ["未上传", "已上传", "已解读", "需补充/有风险", "人工已确认"] as const;
export type ModuleStatus = (typeof moduleStatuses)[number];

export type ReviewModuleConfig = {
  code: string;
  folderCode: FixedProjectFolderCode;
  name: string;
  required: boolean;
  purpose: string;
  expectedContents: string[];
  commonRisks: string[];
  missingImpact: string;
  recommendedMaterials: string[];
  affectsStageGate: boolean;
  supportedMaterialTypes: readonly MaterialObjectType[];
  minimumReviewConditions: string[];
  blockingRules: string[];
  outputTemplate: string[];
  m0m9Modules: string[];
};

export type EvidenceSourceType = "明确陈述" | "上下文推断" | "视觉判断" | "未知";

export type EvidenceTrace = {
  projectId: string;
  folderCode: string;
  moduleCode: string;
  materialObjectId?: string;
  materialName?: string;
  materialVersion?: string;
  interpretationId?: string;
  sourceType: EvidenceSourceType;
  excerpt?: string;
};

const commonOutputTemplate = [
  "模块名称",
  "资料状态",
  "已识别资料",
  "核心内容摘要",
  "结构相关判断",
  "风险点",
  "缺失项",
  "需确认问题",
  "建议动作",
  "置信度",
  "是否阻塞当前阶段",
];

const defaultMaterialTypes = materialObjectTypes;

export const reviewModules = [
  module("MED_000", "basic-info", "项目基本信息", true, "确认项目身份、型号、版本、项目边界和基础追溯信息。", ["项目名称", "产品型号", "版本", "项目阶段", "责任人"], ["项目身份不清导致报告、BOM、图纸和测试记录无法追溯"], "影响所有后续审查结论的归属和追溯。", ["项目基本信息表", "产品定义说明", "项目计划"], true, ["M1", "M2", "M9"]),
  module("MED_000", "product-definition", "产品定义", true, "确认产品用途、主要功能、用户对象和产品边界。", ["产品用途", "核心功能", "用户/患者接触方式", "产品边界"], ["功能边界不清导致结构方案和测试计划偏离真实需求"], "影响需求受付、结构方案和测试验证。", ["产品定义说明", "PRD摘要", "立项资料"], true, ["M2", "M3"]),
  module("MED_000", "project-plan", "项目计划", false, "识别里程碑、样机、试产、验证和量产节奏。", ["里程碑", "样机节点", "试产节点", "量产节点"], ["关键审查节点缺失导致阶段准入判断滞后"], "影响阶段准入和资源安排。", ["项目计划表", "里程碑计划"], false, ["M2", "M9"]),

  module("MED_001", "prd", "产品定义/PRD", true, "把需求转化为结构设计输入。", ["产品功能", "性能边界", "接口需求", "使用限制"], ["需求遗漏导致结构方案返工", "功能需求无法追溯到设计输入"], "影响结构方案、详细设计和阶段准入。", ["PRD", "产品定义说明"], true, ["M2", "M3"]),
  module("MED_001", "use-scenarios", "使用场景", true, "识别产品使用姿态、环境、用户操作和误用场景。", ["使用环境", "使用姿态", "操作动作", "误用/跌落/运输场景"], ["真实使用载荷未识别", "清洁死角或跌落风险遗漏"], "影响结构强度、密封、清洁和可靠性设计。", ["使用场景说明", "用户旅程", "场景图片"], true, ["M2", "M3", "M6"]),
  module("MED_001", "reliability", "可靠性需求", true, "识别跌落、振动、寿命、环境和运输等可靠性目标。", ["跌落", "振动", "寿命", "温湿度", "包装运输"], ["可靠性目标不清导致验证方案不足", "结构强度裕量不足"], "影响结构设计、测试验证和量产承认。", ["可靠性需求清单", "测试标准", "历史失效案例"], true, ["M3", "M6"]),
  module("MED_001", "regulatory-medical", "法规/医疗器械要求", true, "识别法规、注册、安全、材料和人体接触相关要求。", ["法规标准", "医疗器械分类", "接触材料", "标签/警示", "注册限制"], ["法规输入遗漏影响注册或安全合规"], "影响材料、结构、安全、测试和归档。", ["法规需求清单", "医疗器械要求", "注册输入"], true, ["M3", "M6", "M9"]),
  module("MED_001", "cleaning-disinfection", "清洁消毒要求", true, "识别清洁、消毒、死角、缝隙、材料兼容和液体侵入风险。", ["清洁方式", "消毒剂", "清洁频次", "死角要求", "材料兼容"], ["清洁死角", "消毒剂腐蚀", "液体侵入风险"], "影响ID、结构方案、材料和测试。", ["清洁消毒需求", "消毒剂清单", "清洁验证要求"], true, ["M3", "M6"]),
  module("MED_001", "packaging-transport", "包装运输要求", false, "识别运输、跌落、堆码、包装空间和附件约束。", ["包装方式", "运输场景", "堆码", "包装跌落", "附件"], ["运输损伤", "包装空间与结构外形冲突"], "影响外形边界、可靠性和包装验证。", ["包装运输要求", "包装测试标准"], false, ["M3", "M6"]),
  module("MED_001", "structure-boundary", "结构边界条件", true, "明确尺寸、重量、接口、按键、屏幕、传感器、标签和装配边界。", ["外形尺寸", "重量", "接口", "按键/屏幕", "装配边界"], ["关键边界不清导致ID和结构方案反复"], "直接影响结构方案能否启动。", ["结构边界条件清单", "接口定义", "外形约束"], true, ["M2", "M3"]),
  module("MED_001", "open-requirements", "未确认需求清单", false, "集中管理需求疑点和待确认项。", ["待确认问题", "责任人", "截止日期", "影响范围"], ["高风险需求悬而未决导致阶段错误放行"], "影响阶段准入和风险闭环。", ["未确认需求清单", "会议纪要", "问题台账"], true, ["M2", "M6", "M9"]),

  module("MED_002", "id-rendering", "ID效果图/三视图", true, "确认外观方向、比例、三视图和结构可实现性输入。", ["效果图", "三视图", "外形尺寸", "外观限制"], ["外观不可制造", "外形尺寸与结构空间冲突"], "影响结构方案输入。", ["ID效果图", "三视图", "外观尺寸图"], true, ["M2", "M3"]),
  module("MED_002", "interface-layout", "接口/按键/屏幕布局", true, "识别接口、按键、屏幕、指示灯、传感器和用户接触区域。", ["接口位置", "按键位置", "屏幕窗口", "传感器", "标签"], ["装配空间不足", "操作不便", "密封和清洁风险"], "影响结构方案、可靠性和法规标签。", ["接口布局图", "按键屏幕说明"], true, ["M3"]),
  module("MED_002", "cmf", "CMF/材料工艺方向", false, "识别外观材料、表面处理、纹理和工艺方向。", ["材料", "表面处理", "颜色", "纹理", "工艺限制"], ["材料或表面处理不满足消毒/耐磨/法规"], "影响材料、DFM和测试。", ["CMF方案", "材料工艺说明"], false, ["M3", "M4"]),
  module("MED_002", "id-review", "ID评审结论", false, "记录ID阶段评审结论和待确认问题。", ["评审结论", "待确认项", "修改建议"], ["ID问题未闭环即进入结构方案"], "影响阶段准入。", ["ID评审记录", "会议纪要"], true, ["M2", "M6"]),

  module("MED_003", "structure-scheme", "结构方案说明", true, "说明总体结构、拆件、装配路径和关键设计逻辑。", ["总体方案", "拆件", "装配路径", "关键设计"], ["方案逻辑不完整", "装配不可行"], "影响详细设计准入。", ["结构方案PPT", "方案说明"], true, ["M2", "M3"]),
  module("MED_003", "exploded-section", "爆炸图/关键截面", true, "识别结构组成、连接关系、关键截面和空间裕量。", ["爆炸图", "关键截面", "壁厚", "扣位", "螺丝柱"], ["壁厚不足", "干涉", "强度或装配风险"], "影响结构风险和DFM。", ["爆炸图", "关键截面图"], true, ["M3", "M4"]),
  module("MED_003", "initial-bom", "初版BOM", true, "确认主要零件、材料、数量和版本。", ["零件清单", "材料", "数量", "版本"], ["BOM与方案不一致", "材料风险"], "影响详细设计、ECO和量产承认。", ["初版BOM", "零件清单"], true, ["M1", "M3", "M5"]),
  module("MED_003", "scheme-risk-list", "结构风险清单", true, "记录方案阶段关键结构风险和待验证项。", ["风险项", "影响", "责任人", "措施"], ["高风险项无措施即进入详细设计"], "影响阶段准入和后续验证。", ["结构风险清单", "方案评审记录"], true, ["M3", "M6"]),

  module("MED_004", "drawing-package", "2D/3D图纸包", true, "确认图纸、3D、版本和关键技术要求。", ["2D图纸", "3D/STEP/PRT", "技术要求", "版本"], ["图纸版本不清", "技术要求缺失"], "影响DFM、检验和量产。", ["2D图纸包", "3D/STEP/PRT索引"], true, ["M1", "M3", "M4"]),
  module("MED_004", "bom-part-list", "详细BOM/Part list", true, "确认详细零件、材料、数量、版本和图纸关系。", ["BOM", "Part list", "材料", "数量", "版本"], ["BOM与图纸不一致", "材料或版本追溯断裂"], "影响ECO、量产承认和归档。", ["详细BOM", "Part list"], true, ["M1", "M5", "M6"]),
  module("MED_004", "critical-dimensions", "关键尺寸/公差分析", true, "识别关键尺寸、公差、装配间隙和检验要求。", ["关键尺寸", "公差", "装配间隙", "检验尺寸"], ["关键尺寸未定义", "装配间隙不足"], "影响DFM、测试和量产。", ["关键尺寸清单", "公差分析"], true, ["M3", "M4", "M6"]),
  module("MED_004", "materials-spec", "材料规格/表面处理", false, "确认材料牌号、表面处理、环保法规和消毒兼容。", ["材料牌号", "表面处理", "环保", "消毒兼容"], ["材料不满足法规或消毒", "表面处理失效"], "影响法规、可靠性和量产承认。", ["材料规格书", "表面处理要求"], false, ["M3", "M6"]),
  module("MED_004", "dfm-input", "DFM/开模输入", true, "确认DFM、开模、模具分型和改图记录。", ["DFM报告", "分型", "滑块", "顶出", "改图记录"], ["开模前高风险DFM未闭环"], "影响开模和试产。", ["DFM报告", "改图记录", "模具评审"], true, ["M4", "M6"]),

  module("MED_005_007_00", "trial-plan", "试产计划/阶段评审", true, "确认EVT/DVT/PVT试产范围、数量、目标和阶段结论。", ["试产计划", "阶段评审", "数量", "目标"], ["阶段目标不清", "验证覆盖不足"], "影响DVT/PVT/MP准入。", ["试产计划", "阶段评审报告"], true, ["M2", "M6"]),
  module("MED_005_007_00", "trial-issues", "试产问题清单", true, "识别试产结构问题、责任人、改善措施和闭环状态。", ["问题项", "原因", "措施", "责任人", "关闭证据"], ["试产问题未闭环进入下一阶段"], "影响测试闭环和量产风险。", ["试产问题清单", "改善记录"], true, ["M3", "M6"]),
  module("MED_005_007_00", "retest-evidence", "整改/复测证据", true, "确认设计更改、复测和验证证据。", ["整改措施", "复测结果", "验证结论"], ["整改无验证证据"], "影响阶段放行。", ["整改记录", "复测报告"], true, ["M5", "M6"]),

  module("MED_005_007_01", "change-request", "ECO/ECN申请", true, "确认变更原因、范围、申请和通知。", ["变更原因", "变更范围", "申请单", "通知单"], ["变更原因不充分", "影响范围遗漏"], "影响ECO批准和文件更新。", ["ECO申请单", "ECN通知单"], true, ["M5", "M9"]),
  module("MED_005_007_01", "before-after", "变更前后对比", true, "识别图纸、BOM、材料、模具和测试前后差异。", ["图纸差异", "BOM差异", "材料差异", "模具差异"], ["变更影响识别不全"], "影响验证计划和量产文件。", ["变更前后对比", "红线图"], true, ["M5"]),
  module("MED_005_007_01", "validation-signoff", "验证计划/会签", true, "确认验证计划、验证结论和多方会签。", ["验证项目", "验证结论", "会签人"], ["未验证即放行", "会签缺失"], "影响阶段放行和归档。", ["验证计划", "验证报告", "会签记录"], true, ["M5", "M6", "M9"]),

  module("MED_005_007_02", "reliability-tests", "可靠性测试报告", true, "识别跌落、振动、寿命、环境、包装等测试结果。", ["跌落", "振动", "寿命", "环境", "包装"], ["测试失败未闭环", "测试覆盖不足"], "影响DVT/PVT/MP准入。", ["可靠性测试报告", "包装运输测试"], true, ["M3", "M6"]),
  module("MED_005_007_02", "failure-analysis", "失败项/原因分析", true, "确认失败项、根因、整改和复测。", ["失败项", "根因", "整改", "复测"], ["根因不清", "复测不足"], "影响测试闭环。", ["失败分析报告", "复测报告"], true, ["M6"]),
  module("MED_005_007_02", "cleaning-validation", "清洁消毒验证", false, "确认清洁消毒测试、材料兼容和死角验证。", ["消毒剂", "清洁方式", "验证结果"], ["清洁消毒验证不足"], "影响医疗器械法规和使用安全。", ["清洁消毒测试报告"], true, ["M3", "M6", "M9"]),

  module("MED_009", "mass-production-approval", "量产承认资料", true, "确认量产承认、放行和供应商承认。", ["量产承认", "放行记录", "供应商承认"], ["未承认即量产"], "影响正式量产。", ["量产承认资料", "供应商承认资料"], true, ["M2", "M6", "M9"]),
  module("MED_009", "final-bom-drawings", "最终BOM/图纸", true, "确认最终BOM、最终图纸和版本冻结。", ["最终BOM", "最终图纸", "版本冻结"], ["最终文件不一致"], "影响归档和量产追溯。", ["最终BOM", "最终图纸包"], true, ["M1", "M5", "M6"]),
  module("MED_009", "inspection-standards", "检验标准", true, "确认IQC/OQC/关键尺寸和外观检验标准。", ["检验尺寸", "外观标准", "抽检规则"], ["检验标准缺失导致量产质量波动"], "影响量产质量控制。", ["检验标准", "SIP"], true, ["M6", "M9"]),

  module("TROUBLE_LIST", "issue-ledger", "问题台账", true, "统一管理问题、责任人、截止日期、状态和证据。", ["问题项", "责任人", "截止日期", "状态", "证据"], ["问题未闭环", "关闭证据不足"], "影响阶段放行和经验沉淀。", ["Trouble list", "问题清单"], true, ["M6", "M7"]),
  module("TROUBLE_LIST", "action-items", "会议行动项", false, "跟踪会议行动项和关闭状态。", ["行动项", "责任人", "截止日期"], ["行动项遗漏导致风险悬空"], "影响闭环管理。", ["会议纪要", "行动项清单"], false, ["M6", "M9"]),
  module("OTHER", "manual-classification", "人工分类资料", false, "暂存系统无法自动归类的资料，等待用户确认归属模块。", ["资料说明", "建议归类", "用户确认"], ["资料未归类导致审查遗漏"], "影响信息完整性。", ["临时资料", "供应商沟通"], false, ["M1", "M8"]),
] as const satisfies readonly ReviewModuleConfig[];

export type ReviewModuleCode = (typeof reviewModules)[number]["code"];

export function getModulesByFolder(folderCode: string): ReviewModuleConfig[] {
  return reviewModules.filter((reviewModule) => reviewModule.folderCode === folderCode);
}

export function buildModuleReportBaseName(params: {
  projectName: string;
  folderName: string;
  moduleName: string;
  reviewType: string;
  timestamp: string;
}): string {
  return [
    params.projectName,
    params.folderName,
    params.moduleName,
    params.reviewType,
    params.timestamp,
  ].map(normalizeReportNamePart).join("_");
}

export function normalizeReportNamePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "");
}

export function buildReportBaseName(params: {
  projectName: string;
  folderName: string;
  reviewType: string;
  date: string;
}): string {
  return [
    params.projectName,
    params.folderName,
    params.reviewType,
    params.date,
  ].map(normalizeReportNamePart).join("_");
}

function module(
  folderCode: FixedProjectFolderCode,
  code: string,
  name: string,
  required: boolean,
  purpose: string,
  expectedContents: string[],
  commonRisks: string[],
  missingImpact: string,
  recommendedMaterials: string[],
  affectsStageGate: boolean,
  m0m9Modules: string[],
): ReviewModuleConfig {
  return {
    code,
    folderCode,
    name,
    required,
    purpose,
    expectedContents,
    commonRisks,
    missingImpact,
    recommendedMaterials,
    affectsStageGate,
    supportedMaterialTypes: defaultMaterialTypes,
    minimumReviewConditions: getMinimumReviewConditions(code, expectedContents, required),
    blockingRules: affectsStageGate
      ? ["必传模块未上传", "缺失项影响结构设计输入", "存在高风险且未人工确认"]
      : ["选传模块存在高风险且影响当前阶段"],
    outputTemplate: commonOutputTemplate,
    m0m9Modules,
  };
}

function getMinimumReviewConditions(code: string, expectedContents: string[], required: boolean): string[] {
  const specific: Record<string, string[]> = {
    reliability: ["至少包含测试项目", "至少包含判定标准或验收准则", "至少包含适用场景/使用环境", "能够判断测试目标与结构风险的对应关系"],
    prd: ["至少包含产品用途/核心功能", "至少包含关键性能或边界条件", "至少能追溯到结构设计输入"],
    "use-scenarios": ["至少包含使用场景", "至少包含用户操作或误用场景", "至少包含环境/运输/跌落等结构相关载荷之一"],
    "regulatory-medical": ["至少包含适用法规/标准", "至少包含医疗器械或安全相关约束", "至少包含材料/人体接触/标签警示等结构相关输入之一"],
    "cleaning-disinfection": ["至少包含清洁或消毒方式", "至少包含消毒剂/清洁频次/材料兼容之一", "能够判断清洁死角或液体侵入风险"],
    "structure-boundary": ["至少包含外形尺寸或重量", "至少包含接口/按键/屏幕/传感器/装配边界之一", "能够判断结构方案启动边界"],
    "drawing-package": ["至少包含2D图纸或3D/STEP/PRT索引", "至少能识别版本", "至少包含关键技术要求或图纸清单"],
    "bom-part-list": ["至少包含零件名称", "至少包含零件编号/材料/数量/版本之一", "能够与2D/3D图纸做名称或编号对应"],
    "critical-dimensions": ["至少包含关键尺寸", "至少包含公差或装配间隙", "能够判断检验/装配影响"],
    "dfm-input": ["至少包含DFM问题或模具评审项", "至少包含问题结论/改图记录/供应商建议之一", "能够判断是否影响开模或试产"],
    "change-request": ["至少包含变更原因", "至少包含变更范围", "至少包含申请/通知记录"],
    "before-after": ["至少包含变更前后差异", "至少包含受影响图纸/BOM/材料/模具之一", "能够判断验证范围"],
    "validation-signoff": ["至少包含验证项目", "至少包含验证结论或计划", "至少包含会签/审批状态"],
    "reliability-tests": ["至少包含测试项目", "至少包含判定标准", "至少包含测试结果或结论"],
    "failure-analysis": ["至少包含失败项", "至少包含原因分析", "至少包含整改或复测证据"],
    "final-bom-drawings": ["至少包含最终BOM", "至少包含最终图纸或版本冻结证据", "能够与量产承认资料对应"],
    "issue-ledger": ["至少包含问题项", "至少包含责任人或截止日期", "至少包含状态或关闭证据"],
  };
  return specific[code] ?? (required
    ? [`至少覆盖：${expectedContents.slice(0, 3).join("、")}`, "可识别资料来源", "能提取与结构工程相关的有效内容"]
    : ["有资料时进行解读", "无资料时标记为选传缺失或不适用"]);
}
