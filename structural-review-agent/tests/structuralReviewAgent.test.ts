import { runStructuralReviewAgent } from "../src/agents/structuralReviewAgent.ts";
import { describe, expect, it } from "vitest";

// 测试桩：
// 重点验证 M0-M9 是否能完成基础编排，以及报告是否包含追溯、置信度、知识沉淀和治理摘要。
describe("structuralReviewAgent", () => {
  it("runs M0-M9 package review flow", async () => {
    const result = await runStructuralReviewAgent({
      reviewMode: "完整审查",
      files: [
        "血压仪项目_结构资料包/03_结构方案/血压仪项目_结构方案_结构方案说明_RevA_20260603_评审版.pptx",
        "血压仪项目_结构资料包/05_DFM/血压仪项目_DFM_供应商DFM报告_RevA_20260605_供应商版.pptx",
        "血压仪项目_结构资料包/08_ECO_ECN/血压仪项目_ECO_ECO申请单_RevA_20260610_待会签.docx",
      ],
      projectInfo: {},
    });

    expect(result.sections.fileIntake).toBeDefined();
    expect(result.sections.stageGate).toBeDefined();
    expect(result.sections.structuralRisk).toBeDefined();
    expect(result.sections.knowledgeCapture).toBeDefined();
    expect(result.sections.userInteraction).toBeDefined();
    expect(result.sections.governance).toBeDefined();
    expect(result.markdownReport).toContain("结构项目资料审查报告");
    expect(result.markdownReport).toContain("知识沉淀与规则迭代");
  });
});
