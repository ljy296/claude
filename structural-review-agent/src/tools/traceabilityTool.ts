export interface TraceRecord {
  reportVersion: string;
  generatedAt: string;
  inputFiles: string[];
  userSupplement?: string;
}

export async function createTraceRecord(record: TraceRecord) {
  // 追溯工具：
  // 用于记录报告版本、生成时间、输入文件范围、用户补充内容和当时的结论。
  // 后续可接数据库、对象存储或企业文档管理系统。
  return {
    ...record,
    status: "recorded-in-memory",
  };
}
