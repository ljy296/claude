import type { StructuralReviewInput } from "../agents/structuralReviewAgent.ts";
import type { KnowledgeCaptureResult } from "./knowledgeCaptureModule.ts";
import type { UserInteractionResult } from "./userInteractionModule.ts";
import type { AuditLogRecord, ModuleResult, RuleUpdateSuggestion } from "../types.ts";

export interface GovernanceResult extends ModuleResult {
  reviewMode: StructuralReviewInput["reviewMode"];
  permissionChecklist: string[];
  sensitiveDataCategories: string[];
  auditLogs: AuditLogRecord[];
  feedbackCategories: string[];
  ruleUpdateQueue: RuleUpdateSuggestion[];
}

export async function runGovernanceModule(
  input: StructuralReviewInput,
  context: {
    knowledgeCapture: KnowledgeCaptureResult;
    userInteraction: UserInteractionResult;
  },
): Promise<GovernanceResult> {
  // M9 治理、反馈与规则迭代模块：
  // 定义权限、保密、操作日志、用户反馈分类和规则更新审批。
  // 关键原则：AI 可以建议更新规则，但正式规则必须由结构工程师和管理员确认后生效。
  const timestamp = new Date().toISOString();
  const sourcePath = typeof input.projectInfo.sourcePath === "string"
    ? input.projectInfo.sourcePath
    : "未提供资料包路径";
  const auditLogs: AuditLogRecord[] = [
    {
      action: "资料包审查",
      actor: "AI Agent",
      timestamp,
      target: sourcePath,
      detail: `执行 ${input.reviewMode}，输入文件 ${input.files.length} 个。`,
    },
    {
      action: "补充问题生成",
      actor: "AI Agent",
      timestamp,
      target: "补充问题表",
      detail: `生成 ${context.userInteraction.supplementalQuestions.length} 个补充问题。`,
    },
    {
      action: "知识沉淀候选生成",
      actor: "AI Agent",
      timestamp,
      target: "高频问题点",
      detail: `生成 ${context.knowledgeCapture.entries.length} 条知识候选。`,
    },
  ];

  return {
    module: "M9 Governance Feedback And Rule Iteration",
    summary: `生成审计日志 ${auditLogs.length} 条，规则更新队列 ${context.knowledgeCapture.ruleUpdateSuggestions.length} 条。`,
    reviewMode: input.reviewMode,
    permissionChecklist: [
      "确认上传人是否有项目资料上传权限",
      "确认查看人是否有项目资料查看权限",
      "确认下载报告是否需要项目经理或质量负责人授权",
      "确认风险关闭人是否具备关闭权限",
      "确认 ECO/ECN 结论是否由指定审批角色确认",
      "确认知识库沉淀内容是否可被跨项目访问",
    ],
    sensitiveDataCategories: [
      "产品未公开信息",
      "供应商报价",
      "BOM成本",
      "模具资料",
      "测试失败",
      "ECO变更",
      "注册资料",
      "客诉或售后问题",
      "客户信息",
      "患者或用户相关信息",
    ],
    auditLogs,
    feedbackCategories: [
      "识别错误",
      "文件阶段分类错误",
      "文件版本判断错误",
      "风险等级错误",
      "DFM问题提取错误",
      "ECO影响分析错误",
      "测试闭环判断错误",
      "输出内容不完整",
      "需要新增规则",
    ],
    ruleUpdateQueue: context.knowledgeCapture.ruleUpdateSuggestions,
  };
}
