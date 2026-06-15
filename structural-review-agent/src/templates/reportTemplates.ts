export const reportTemplates = {
  // 标准审查报告：完整审查模式使用，覆盖阶段、文件、风险、闭环和下一步建议。
  standardReviewSections: [
    "报告信息",
    "项目阶段识别",
    "文件完整性审查",
    "文件命名与版本审查",
    "AI已理解的结构信息",
    "当前阶段准入/退出审查",
    "结构风险清单",
    "DFM/ECO/测试闭环状态",
    "需要用户补充的信息",
    "下一步建议",
  ],

  // 专项模板：不同审查模式可以选择不同模板，避免输出过大。
  specialReports: {
    dfm: "DFM问题解析报告",
    eco: "ECO/ECN变更影响分析报告",
    closure: "测试与问题闭环检查报告",
    knowledge: "高频问题点知识沉淀表",
  },
} as const;
