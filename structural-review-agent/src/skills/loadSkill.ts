export interface LoadedSkill {
  name: string;
  sourcePath: string;
  description: string;
}

export async function loadStructuralReviewSkill(): Promise<LoadedSkill> {
  // Skill 加载器：
  // 后续可在这里读取 SKILL.md、AGENT_MODULES.md、REFERENCE_RULES.md 和 OUTPUT_TEMPLATES.md。
  // 当前先返回规则源位置，避免业务代码散落硬编码路径。
  return {
    name: "structural-project-review",
    sourcePath: ".cursor/skills/structural-project-review",
    description: "结构项目资料审查、阶段评审、DFM、ECO、闭环和知识沉淀规则源。",
  };
}
