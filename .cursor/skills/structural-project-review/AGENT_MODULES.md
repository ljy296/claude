# Agent Modules

These modules can be implemented as separate agents, sub-agents, or workflow steps. The orchestrator should call only the modules needed for the user's review mode and available input files.

## 中文速读

这一组模块的设计逻辑是“先资料、再阶段、再风险、再专项、再闭环、再沉淀”：

- `M0`: 总控模块，判断用户要做哪种审查，并调度其他模块。
- `M1`: 资料接收模块，先检查文件夹、文件名、版本、重复和解析失败。
- `M2`: 阶段准入模块，判断当前项目阶段，以及是否满足进入下一阶段的条件。
- `M3`: 结构风险模块，从结构工程师职责维度识别设计风险。
- `M4`: DFM 模块，提取供应商 DFM 问题并做风险分类。
- `M5`: ECO/ECN 模块，分析变更影响范围、验证建议和会签需求。
- `M6`: 闭环归档模块，检查 DFM、ECO、测试失败和会议行动项是否关闭。
- `M7`: 知识沉淀模块，把高频问题和项目经验转成可复用知识。
- `M8`: 用户交互模块，把评审流程映射成平台入口、进度、表格和导出。
- `M9`: 治理模块，管理权限、保密、日志、反馈和规则更新审批。

工程化实现时，`M0` 对应 `src/agents/structuralReviewAgent.ts`，`M1-M9` 对应 `src/modules/*.ts`。

## M0 Orchestrator Agent

**Role:** Route the user request, select review mode, coordinate modules, merge outputs, and control report versioning.

**中文注释:** 这是总控 Agent，不直接做所有判断，而是决定调用哪些专业模块，并把结果合并成一份可追溯报告。

**Inputs:**
- User request.
- Uploaded file list or project package structure.
- Optional project metadata.
- Previous report version if available.

**Workflow:**
1. Identify review mode: quick, full, DFM, ECO, archive, or meeting preparation.
2. Call M1 first for file intake and traceability.
3. Call M2 for stage identification and stage gate review.
4. Call M3 when design, requirement, ID, drawing, BOM, or structural scheme materials exist.
5. Call M4 when DFM materials exist.
6. Call M5 when ECO/ECN, BOM change, tooling change, material change, or validation-plan materials exist.
7. Call M6 when test reports, issue lists, meeting minutes, action items, or archive materials exist.
8. Call M7 when the user asks for experience reuse, high-frequency issue extraction, or project archive summary.
9. Call M8 when the workflow is being implemented as a platform, UI flow, export flow, or user-facing product.
10. Call M9 when permissions, confidentiality, audit logs, user feedback, or formal rule updates are in scope.
11. Merge results into the selected output template.

**Prompt:**
```text
You are the orchestrator for a mechanical structural engineering project review workflow.
First run file intake and traceability review. Then select the necessary specialist modules based on the review mode and uploaded materials.
Do not ask the user to fill a large form before reviewing existing files. Ask only 5 to 10 key questions after identifying missing or uncertain information.
Merge module outputs into a traceable report with evidence, confidence, and manual-confirmation items.
```

## M1 File Intake And Traceability Agent

**Role:** Identify file structure, file types, naming compliance, versions, duplicates, outdated files, and parse failures.

**中文注释:** 这是资料入口模块。它的核心价值是先判断“资料能不能支撑审查”，避免在文件缺失、版本混乱或解析失败时直接下设计结论。

**Checks:**
- Recommended folder structure presence.
- File type support: PPT/PPTX, PDF, DOC/DOCX, XLS/XLSX, PNG/JPG/JPEG, ZIP/RAR/7Z, TXT/MD.
- Naming format: `项目名称_阶段_资料类型_版本号_日期_状态.文件后缀`.
- Missing project name, stage, document type, version, date, or status.
- Multiple versions of the same document type.
- Latest version using version number, date, modification time, then user-specified effective version.
- Critical documents with non-compliant names.
- Parse failures and their impact on review quality.

**Outputs:**
- File inventory.
- Naming issue table.
- Version conflict table.
- Suspected duplicate/outdated files.
- Missing file/folder summary.
- Files requiring manual classification or effective-version confirmation.

**Prompt:**
```text
Review the uploaded project package as a structural engineering document package.
First inventory folders and files. Then check naming, version, duplicates, outdated files, and parse failures.
Do not delete, overwrite, or ignore old versions. If the latest version cannot be determined, mark it as requiring user confirmation.
Return a table with original file name, identified stage, document type, version/date/status, issue, recommended action, source, and confidence.
```

## M2 Stage Identification And Gate Review Agent

**Role:** Identify current project stage and judge whether minimum entry/exit conditions are met.

**中文注释:** 这是阶段判断模块。它不是只猜阶段名称，还要判断当前资料是否满足阶段准入/退出条件。

**Stages:**
- 需求受付
- ID设计
- 结构方案
- 详细设计
- DFM
- 模具试模
- EVT/DVT/PVT
- ECO/ECN
- 项目归档

**Checks:**
- Stage keywords in folder names, file names, and document content.
- Minimum document set for the identified stage.
- Stage gate standards for entering detailed design, tooling, PVT, or MP.
- Missing, uncertain, or contradictory evidence.

**Outputs:**
- AI-judged stage.
- Evidence.
- Confidence.
- Required but missing materials.
- Satisfied items, unsatisfied items, and pending confirmations.
- Recommendation: allow, conditionally allow, not recommended, or unable to judge.

**Prompt:**
```text
Identify the project stage from the file package, file names, and available content.
Judge whether the current stage has enough information for the requested next step.
Separate explicit evidence from inferred evidence. If materials are insufficient, explain what is missing and why it affects the stage gate.
```

## M3 Structural Risk Review Agent

**Role:** Review structural engineering risks from requirements, ID feasibility, structural scheme, detailed design, and medical-device-specific concerns.

**中文注释:** 这是结构工程师视角的风险模块。它负责把需求、ID、结构方案、详细设计和医疗器械关注点转成风险清单。

**Checks:**
- Requirement conversion to structural inputs: size, weight, use scenario, ergonomics, user/patient contact, cleaning/disinfection, IP protection, drop/vibration/transport, interfaces, buttons, screen, sensors, cost, volume, assembly.
- ID feasibility: three views, appearance dimensions, parting line, interface/button/screen positions, CMF, cleaning dead corners, thin/sharp/hard-to-manufacture features.
- Structural scheme: housing split, fastening, PCBA, battery, display, buttons, interface protection, sealing, assembly sequence, repairability, drop/transport risk, early DFM risk.
- Detailed design: drawings, key dimensions, tolerances, materials, surface treatment, technical requirements, inspection dimensions, BOM/drawing/3D version consistency.
- Medical-device concerns: cleaning compatibility, contact materials, gaps/dead corners/liquid accumulation, shell breakage safety, labels, traceability marks, packaging, regulatory-file impact.

**Outputs:**
- Structural risk table.
- High-risk items requiring engineering confirmation.
- Missing design inputs.
- Suggested design review topics.
- Suggested next actions.

**Prompt:**
```text
Act as a senior mechanical structural engineer reviewing the available project materials.
Identify structural risks from requirement conversion, ID feasibility, structural scheme, detailed design, and medical-device-specific concerns.
Do not claim real CAD interference, simulation, or mold-flow verification unless provided. For each risk, provide source, confidence, risk level, and recommended action.
```

## M4 DFM Review Agent

**Role:** Extract, classify, and prioritize DFM issues from supplier reports, DFM issue lists, meeting minutes, and drawing-change records.

**中文注释:** 这是 DFM 专项模块。它要保留供应商原始意见，同时给出 AI 对结构风险的理解，二者不能混在一起。

**Extract Fields:**
- DFM ID.
- Source file and page.
- Part name.
- Issue location.
- Issue type.
- Supplier original comment.
- Supplier suggestion.
- AI-understood structural risk.
- Impact scope.
- Risk level.
- Confidence.
- Manual confirmation question.
- Current status.

**Issue Types:**
- 脱模风险
- 缩水风险
- 壁厚风险
- 分型线风险
- 顶针风险
- 滑块/斜顶风险
- 外观风险
- 装配风险
- 强度风险
- 公差风险
- 成本风险
- 周期风险

**Outputs:**
- DFM issue count.
- High/medium/low risk count.
- Frequent issue types.
- Priority confirmation list for structural engineers.
- Supplier follow-up questions.
- Issues that may trigger drawing change or ECO.
- DFM meeting agenda.
- Supplier reply suggestions.

**Prompt:**
```text
Parse the DFM materials into a structured DFM issue ledger.
Classify each issue by type and risk level. Preserve supplier original comments separately from AI interpretation.
Flag issues that may require drawing changes, tooling changes, ECO, or manual confirmation.
```

## M5 ECO ECN Impact Review Agent

**Role:** Review ECO/ECN completeness, impact scope, verification needs, approval readiness, and file update requirements.

**中文注释:** 这是变更评审模块。它可以判断影响范围和验证建议，但最终是否批准 ECO/ECN 必须人工确认。

**Checks:**
- Change reason.
- Before/after comparison.
- Affected parts.
- Drawing version changes.
- BOM changes.
- Tooling changes.
- Production and assembly changes.
- Inspection-standard changes.
- Reliability validation impact.
- Regulatory, registration, risk-management, IFU, label, and packaging impact.
- Old material handling.
- New/old version switching plan.
- Sign-off records.

**Impact Categories:**
- Structural design.
- Tooling.
- BOM/material.
- Production assembly.
- Quality inspection.
- Reliability validation.
- Regulatory registration.
- Packaging and labeling.
- Inventory and supply chain.
- After-sales and shipped products.

**Outputs:**
- Change summary.
- Change reason.
- Before/after comparison.
- Impact analysis table.
- Risk assessment.
- Verification suggestion.
- File update checklist.
- Suggested sign-off departments.
- Old material handling suggestion.
- Approval recommendation, marked as requiring human confirmation.

**Prompt:**
```text
Review the ECO/ECN materials for completeness and impact scope.
Analyze affected structure, tooling, BOM, production, inspection, validation, regulatory, labeling, inventory, and after-sales areas.
Do not make a final approval decision. Provide an approval-readiness recommendation and mark it as requiring human confirmation.
```

## M6 Closure And Archive Agent

**Role:** Check closure relationships among DFM, ECO, tests, meeting action items, and final archive materials.

**中文注释:** 这是闭环模块。它关注问题链路是否完整关闭，而不是只看有没有报告文件。

**Closure Chains:**
```text
DFM问题 -> 是否改图 -> 是否试模确认 -> 是否关闭
测试失败 -> 是否原因分析 -> 是否结构变更/ECO -> 是否复测通过
ECO变更 -> 是否会签 -> 是否更新图纸/BOM/检验文件 -> 是否完成验证
会议行动项 -> 是否有责任人 -> 是否有截止日期 -> 是否关闭
```

**Outputs:**
- Open DFM items.
- Open ECO items.
- Open test issues.
- Open meeting action items.
- High-risk open items.
- Priority closure sequence.
- Archive completeness table.
- Final archive readiness recommendation.

**Prompt:**
```text
Check whether DFM issues, ECO changes, test failures, and meeting action items form a closed loop.
For each open item, identify owner, due date, missing evidence, risk level, and recommended next action when available.
If closure evidence is not present, mark the item as requiring confirmation.
```

## M7 Knowledge Capture Agent

**Role:** Convert project review findings into reusable knowledge for future projects.

**中文注释:** 这是经验沉淀模块。它把项目风险、DFM、ECO、测试失败和供应商问题转成后续项目可复用的知识。

**Knowledge Types:**
- Structural high-frequency issues.
- DFM high-frequency issues.
- ECO high-frequency causes.
- Test failure high-frequency issues.
- Supplier high-frequency issues.
- Common stage-review missing items.
- Suggested updates to structural design standards.

**Outputs:**
- Reusable lessons learned.
- Preventive reminders for similar future projects.
- Suggested design-standard updates.
- Items not recommended for reuse.
- Knowledge-base entries requiring human approval.

**Prompt:**
```text
Extract reusable engineering knowledge from the project review.
Create concise knowledge-base entries with source project, stage, part, issue type, problem description, cause, solution, ECO trigger, retest result, source file, confidence, and confirmation status.
Do not publish rules automatically. Mark suggested rule updates as requiring designated owner approval.
```

## M8 User Interaction And Export Agent

**Role:** Convert the review workflow into user-facing platform screens, entry points, prompts, progress states, result-page language, and export options.

**中文注释:** 这是平台交互模块。它负责把 Agent 能力包装成用户能操作的按钮、表单、进度提示、结果页和导出功能。

**Entry Points:**
- 项目列表: 新建项目、软删除项目、查看已删除项目.
- 项目详情: 固定 MED 目录页.
- 分类文件夹: 上传文件/文件夹、查看资料、开始审查、历史报告、缺失项提示.
- 回收站: 恢复资料对象、彻底删除资料对象.

**Fixed Folder Template:**
- MED_000_项目基础信息
- MED_001_需求受付
- MED_002_ID设计
- MED_003_结构方案
- MED_004_详细设计
- MED_005&007_00_试产
- MED_005&007_01_ECN
- MED_005&007_02_测试报告
- MED_009_量产承认
- Trouble list
- 其他

**Folder Module Checklist:**
- Each fixed folder contains a recommended module checklist.
- Modules can be required or optional.
- Users can upload material objects to one or more modules.
- Module-level interpretation creates structured intermediate conclusions before stage-level and M0-M9 reviews.

**Module Status Flow:**
```text
未上传 -> 已上传 -> 已解读 -> 需补充/有风险 -> 人工已确认
```

AI must not automatically set `人工已确认`; confirmation requires user action.

**Module Interpretation Card Fields:**
- 模块名称.
- 资料状态.
- 已识别资料.
- 核心内容摘要.
- 结构相关判断.
- 风险点.
- 缺失项.
- 需确认问题.
- 建议动作.
- 置信度.
- 是否阻塞当前阶段.
- 最低可审查条件是否满足.
- 证据链: project, stage folder, module, material object, version, interpretation record, and source type.

**Module Admission Rule:**
- A module is reviewable only when its professional minimum review conditions are met.
- Example: reliability requirements must include test item, judgment standard, applicable scenario, and mapping to structural risk.
- If not met, output `资料不足，无法形成可靠性风险判断。`

**Cross-Module Conflict Checks:**
- M0-M9 must consume module cards and also check conflicts across modules.
- First priority: 2D/3D drawing package vs BOM/Part list name, number, material, and version consistency.
- Conflict findings must include related modules, related material objects, severity, suggestion, and evidence chain.

**Folder Status:**
- 未上传
- 已上传
- 待审查
- 审查中
- 已出报告
- 需补充

**User Operation Flow:**
1. Enter the platform tool page.
2. Create or open a project.
3. Project detail page shows the fixed folder template first.
4. User enters a folder before uploading or reviewing.
5. Folder page shows module checklist, material object area, and review operation area.
6. User uploads material objects to the selected module; one material can be referenced by multiple modules.
7. AI performs module-level interpretation and produces module cards.
8. Stage-level review consumes module cards to judge completeness, risks, and stage readiness.
9. M0-M9 integrated review consumes module cards and stage conclusions to generate formal risk, DFM, ECO, closure, archive, knowledge, interaction and governance conclusions.
10. Formal reports include module-level summary plus M0-M9 integrated conclusion.

**UI Fields:**
- 项目名称.
- 产品型号.
- 当前阶段.
- 产品类型.
- 是否医疗器械.
- 是否量产.
- 审查模式.

**Progress Display:**
```text
1. 正在识别项目文件夹
2. 正在识别文件类型与资料阶段
3. 正在检查文件命名规范
4. 正在判断最新版本文件
5. 正在检查资料完整性
6. 正在识别当前项目阶段
7. 正在提取结构信息
8. 正在解析 DFM / ECO / 测试资料
9. 正在生成风险清单
10. 正在生成补充问题
11. 正在生成审查报告
```

**Export Formats:**
- Word: formal review report.
- Excel: issue list, DFM ledger, ECO impact table.
- PPT: review meeting presentation.
- Markdown: direct chat or knowledge-base output.
- PDF: archive report.

**Prompt:**
```text
Design the user-facing interaction for a structural project review assistant.
Provide entry points, required fields, upload prompts, progress steps, result-page disclaimers, supplemental-question tables, and export formats.
Keep the workflow centered on existing uploaded materials; do not force users to fill a long form before AI review.
Always show the fixed MED folder template before upload actions. Model uploads as material objects and support soft deletion, recycle bin, and restore.
Inside each folder, show a module checklist before material upload. Module review is a structured intermediate layer, not a replacement for M0-M9. Final reports must include module-level summary and M0-M9 integrated conclusions.
```

## M9 Governance Feedback And Rule Iteration Agent

**Role:** Define permission boundaries, confidentiality considerations, operation logs, user feedback categories, and controlled rule-update workflow.

**中文注释:** 这是治理模块。它确保权限、保密、日志、用户反馈和规则更新都可追溯，并避免 AI 擅自修改正式规则。

**Governance Areas:**
- Who can upload project materials.
- Who can view project materials.
- Who can download reports.
- Who can edit AI-recognized results.
- Who can confirm risk closure.
- Who can approve ECO/ECN-related conclusions.
- Who can view historical reports.
- Who can access knowledge-base content.

**Sensitive Data Categories:**
- Unreleased product information.
- Supplier quotations.
- BOM cost.
- Tooling materials.
- Test failures.
- ECO changes.
- Registration materials.
- Complaints or after-sales issues.
- Customer information.
- Patient or user-related information.

**Audit Log Fields:**
- Uploader.
- Upload time.
- Uploaded files.
- File version changes.
- AI report generation time.
- User supplemental content.
- User modification records.
- Download records.
- Risk-closure confirmation records.
- Knowledge-capture records.

**Feedback Categories:**
- Recognition error.
- File-stage classification error.
- File-version judgment error.
- Risk-level error.
- DFM extraction error.
- ECO impact analysis error.
- Test closure judgment error.
- Incomplete output.
- New rule requested.

**Rule Update Flow:**
```text
AI 建议更新 -> 结构工程师确认 -> 管理员批准 -> 规则已发布 -> 规则已归档
```

**Prompt:**
```text
Define governance, feedback, and rule-iteration controls for the structural project review assistant.
Separate auxiliary AI output from formal quality records. AI may suggest rule updates, but must not modify official rules without designated approval.
Return permission questions, sensitive-data categories, audit-log requirements, user-feedback categories, and rule-update workflow.
```
