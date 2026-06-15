# 结构项目资料审查与风险评审 Agent

这是把 `structural-project-review` Skill 产品化后的 Agent 工程骨架。

## 结构选择结论

`customer-agent/` 这类结构更适合“可运行 Agent 工程”，因为它把 Agent 编排、Skill 加载、外部工具、LLM 客户端和测试拆开，便于后续接入平台、数据库、PLM、QMS 或导出服务。

但你的内容不是单一业务 Agent，而是一套“结构工程师评审规则 + 多 Agent 模块 + 平台化流程”。因此本项目采用混合结构：

- `.cursor/skills/structural-project-review/`: Cursor 内直接调用的 Skill 规则源。
- `structural-review-agent/`: 面向产品化、接口化、测试化的 Agent 工程骨架。

## 目录映射

```text
structural-review-agent/
├── README.md
├── package.json
├── .env.example
├── .cursor/
│   └── rules/
│       └── project.mdc
├── skills/
│   └── structural-project-review/
│       └── SKILL.md
├── src/
│   ├── index.ts
│   ├── agents/
│   │   └── structuralReviewAgent.ts
│   ├── modules/
│   │   ├── fileIntakeModule.ts
│   │   ├── stageGateModule.ts
│   │   ├── structuralRiskModule.ts
│   │   ├── dfmReviewModule.ts
│   │   ├── ecoReviewModule.ts
│   │   ├── closureArchiveModule.ts
│   │   ├── knowledgeCaptureModule.ts
│   │   ├── userInteractionModule.ts
│   │   └── governanceModule.ts
│   ├── skills/
│   │   └── loadSkill.ts
│   ├── rules/
│   │   └── structuralRules.ts
│   ├── templates/
│   │   └── reportTemplates.ts
│   ├── tools/
│   │   ├── documentTool.ts
│   │   ├── exportTool.ts
│   │   └── traceabilityTool.ts
│   └── llm/
│       └── client.ts
└── tests/
    └── structuralReviewAgent.test.ts
```

## 模块映射

| 原模块 | 工程文件 | 作用 |
|---|---|---|
| M0 Orchestrator | `src/agents/structuralReviewAgent.ts` | 总控编排，决定调用哪些模块并合并报告 |
| M1 File Intake | `src/modules/fileIntakeModule.ts` | 文件结构、命名、版本、解析失败、追溯 |
| M2 Stage Gate | `src/modules/stageGateModule.ts` | 阶段识别和阶段准入判断 |
| M3 Structural Risk | `src/modules/structuralRiskModule.ts` | 结构职责维度风险评审 |
| M4 DFM Review | `src/modules/dfmReviewModule.ts` | DFM 问题提取、分类、风险判断 |
| M5 ECO Review | `src/modules/ecoReviewModule.ts` | ECO/ECN 影响分析和验证建议 |
| M6 Closure Archive | `src/modules/closureArchiveModule.ts` | DFM/ECO/测试/会议行动项闭环和归档 |
| M7 Knowledge Capture | `src/modules/knowledgeCaptureModule.ts` | 高频问题和项目经验沉淀 |
| M8 User Interaction | `src/modules/userInteractionModule.ts` | 平台入口、表单、进度、导出交互 |
| M9 Governance | `src/modules/governanceModule.ts` | 权限、保密、日志、反馈和规则迭代 |

## 推荐实施顺序

1. 先用 `.cursor/skills/structural-project-review/` 验证评审规则是否稳定。
2. 再用本工程骨架实现 M0-M6，形成可运行的资料包审查流程。
3. 第三步实现 M7-M9，补齐知识沉淀、平台交互、权限日志和规则迭代。
4. 最后接入真实文档解析、Excel 导出、Word/PDF 报告和企业系统。

## 当前可运行范围

当前已实现 M0-M9 的可运行流程：

- M0: 总控编排和 Markdown 报告生成。
- M1: 文件列表扫描、命名规范检查、阶段/资料类型推断、重复版本组识别。
- M2: 项目阶段识别、最小资料集检查、阶段 Gate 建议。
- M3: 基于缺失资料和阶段 Gate 的结构风险清单。
- M4: DFM 相关文件识别和待确认 DFM 台账摘要。
- M5: ECO/ECN 相关文件识别、影响范围和批准准备度建议。
- M6: DFM/ECO/测试/会议行动项/归档闭环证据检查。
- M7: 基于风险、DFM、ECO、闭环结果生成知识沉淀候选和规则更新建议。
- M8: 生成平台入口、进度步骤、补充问题表和导出建议。
- M9: 生成权限检查、敏感资料分类、审计日志、反馈分类和规则更新队列。

## 运行方式

安装依赖：

```bash
npm install
```

审查一个资料包目录：

```bash
npm run dev -- "E:/path/to/项目名称_结构资料包" 完整审查
```

审查并导出 Markdown、Excel、Word、PDF：

```bash
npm run dev -- "E:/path/to/项目名称_结构资料包" 完整审查 --out reports --formats markdown,excel,word,pdf
```

按固定目录审查并使用新报告命名规则：

```bash
npm run dev -- "E:/path/to/项目名称_结构资料包/MED_001_需求受付" 完整审查 --out reports --formats markdown,excel,word,pdf --project 智能助听器 --folder MED_001_需求受付
```

导出文件名会使用：

```text
项目名_审查文件夹名称_审查类型_时间
```

例如：

```text
智能助听器_MED_001_需求受付_完整审查_20260605.md
```

如果当前环境没有 `npm`，但 Node 版本为 22 或更高，也可以直接运行：

```bash
node --experimental-strip-types src/index.ts "E:/path/to/项目名称_结构资料包" 完整审查
```

也可以运行专项模式：

```bash
npm run dev -- "E:/path/to/项目名称_结构资料包" DFM专项
npm run dev -- "E:/path/to/项目名称_结构资料包" ECO专项
npm run dev -- "E:/path/to/项目名称_结构资料包" 归档专项
```

验证：

```bash
npm run typecheck
npm test
```

## 文档解析与导出

当前版本已经接入真实文档解析和报告导出：

- `docx`: 提取 Word 正文文本。
- `xlsx`: 提取 Excel 工作表文本和表格摘要。
- `pdf`: 提取 PDF 文本。
- `pptx`: 读取 PPTX 内部 slide XML 文本。
- `png/jpg/jpeg`: 使用 OCR 提取图片文字。
- `txt/md`: 直接读取文本。

导出格式：

- Markdown: 完整审查报告。
- Excel: 风险清单、DFM 台账、ECO 影响表、补充问题表、知识沉淀表。
- Word: 正式报告草稿。
- PDF: 归档版报告。

注意：图片 OCR 和扫描 PDF 的识别质量取决于原始图片清晰度，相关结论应标记为低置信度或需人工确认。企业系统接口本阶段尚未接入真实 API。
