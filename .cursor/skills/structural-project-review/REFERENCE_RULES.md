# Reference Rules

## Recommended Project Package Structure

```text
项目名称_结构资料包/
├── MED_000_项目基础信息/
├── MED_001_需求受付/
├── MED_002_ID设计/
├── MED_003_结构方案/
├── MED_004_详细设计/
├── MED_005&007_00_试产/
├── MED_005&007_01_ECN/
├── MED_005&007_02_测试报告/
├── MED_009_量产承认/
├── Trouble list/
└── 其他/
```

## Recommended Documents By Folder

| Folder | Recommended Documents |
|---|---|
| MED_000_项目基础信息 | 项目基本信息表、产品定义说明、项目计划表、产品型号/版本说明 |
| MED_001_需求受付 | PRD、用户需求说明、可靠性需求、法规需求清单、清洁消毒需求、需求评审记录 |
| MED_002_ID设计 | ID效果图、ID三视图、外观尺寸图、CMF方案、ID评审记录、外观/丝印/图标资料 |
| MED_003_结构方案 | 结构方案说明、爆炸图、关键截面图、初版BOM、结构风险清单、方案评审记录 |
| MED_004_详细设计 | 2D图纸包、3D/STEP/PRT索引、详细BOM、Part list、关键尺寸清单、公差分析、材料规格书、模具/DFM资料 |
| MED_005&007_00_试产 | EVT/DVT/PVT试产报告、试产问题清单、阶段评审报告、试产改善记录 |
| MED_005&007_01_ECN | ECO申请单、ECN通知单、变更前后对比、变更影响分析、验证计划、会签记录 |
| MED_005&007_02_测试报告 | 跌落、振动、按键寿命、插拔寿命、清洁消毒、包装运输、可靠性等测试报告 |
| MED_009_量产承认 | 量产承认资料、最终BOM、最终图纸包、检验标准、供应商承认资料、量产放行记录 |
| Trouble list | 项目问题清单、DFM问题台账、测试失败项、会议行动项、关闭证据 |
| 其他 | 无法归类资料、临时补充说明、供应商沟通、历史资料、需人工分类资料 |

## Folder Status Rules

Each fixed project folder should maintain an independent status:

| Status | Meaning |
|---|---|
| 未上传 | No material object exists in this folder |
| 已上传 | Material objects exist but review has not started |
| 待审查 | Materials are ready and waiting for review |
| 审查中 | A review job is running for this folder |
| 已出报告 | At least one report has been generated for this folder |
| 需补充 | Missing or uncertain items block a reliable conclusion |

When a user enters a project, the platform should show this fixed folder structure first. The user enters a folder before uploading, deleting, reviewing, or generating reports for that folder.

Each folder detail page should provide these entry actions:

- 上传文件/文件夹
- 查看资料
- 开始审查
- 历史报告
- 缺失项提示

## Module Checklist Rules

Each fixed project folder is not only a container. It should contain a module checklist. Modules are smaller engineering judgment units that can be reviewed independently before the stage-level and M0-M9 reviews.

Module status flow:

```text
未上传 -> 已上传 -> 已解读 -> 需补充/有风险 -> 人工已确认
```

Rules:

- `人工已确认` must be set by a user. AI can recommend confirmation but cannot set it automatically.
- A material object may be referenced by multiple modules, but the original file should be stored only once.
- Module-level review results are shown in the platform by default. They become exported module reports only when the user explicitly clicks export or generate formal report.
- Stage reports and project reports should include two layers:
  1. Module-level summary: uploaded, interpreted, confirmed, missing, and blocking modules.
  2. M0-M9 integrated conclusion: risks, DFM, ECO, test closure, stage gate, archive recommendation.

Module-level report naming:

```text
项目名_阶段文件夹名称_模块名称_审查类型_时间
```

Example:

```text
智能助听器_MED_001_需求受付_可靠性需求_模块深度解读_20260608_1036
```

Each module configuration should include:

- 模块名称
- 模块目的
- 应包含内容
- 常见风险
- 缺失时影响
- 推荐补充资料
- 是否影响阶段准入
- 必传/选传属性
- 支持的资料类型
- 最低审查条件
- 阻塞项判断规则
- 输出模板
- 对应 M0-M9 审查模块

## Module Admission Rules

Each module must define professional minimum review conditions. A module is not reviewable only because files exist.

Example for `可靠性需求`:

- Must include test items, such as drop, vibration, life, environment, packaging, or transport.
- Must include judgment criteria, acceptance standards, or pass/fail rules.
- Must include applicable scenario, use environment, or transport/use condition.
- Must allow mapping from reliability target to structural risk.

If these conditions are not met, output:

```text
资料不足，无法形成可靠性风险判断。
```

Admission rule principles:

- If required module does not meet minimum review conditions, it may block stage gate.
- If optional module lacks material, mark as optional missing or not applicable, unless existing evidence shows high risk.
- AI can state whether the module meets minimum review conditions, but formal acceptance still requires human confirmation.

## Evidence Chain Rules

Every risk, missing item, and judgment conclusion must be traceable to evidence:

- 项目
- 阶段文件夹
- 模块
- 资料对象
- 资料版本
- 解读记录
- 信息来源类型：明确陈述、上下文推断、视觉判断、未知

If evidence is missing, mark the conclusion as low confidence or unknown. Do not present it as a formal finding.

## Cross-Module Conflict Checks

M0-M9 integrated review should include cross-module conflict checks. Module-level conclusions are inputs, but cross-module consistency is a higher-level responsibility.

Key first-version checks:

- `MED_004_详细设计`: 2D/3D drawing package vs detailed BOM/Part list name, number, material, and version consistency.
- `MED_004_详细设计`: Critical dimensions vs drawing package technical requirements.
- `MED_005&007_01_ECN`: ECO/ECN change scope vs affected BOM/drawing/test modules.
- `MED_005&007_02_测试报告`: Test failures vs Trouble list closure evidence.
- `MED_009_量产承认`: Final BOM/drawings vs inspection standards and approval records.

When a conflict is found, output:

- 冲突标题
- 严重度
- 涉及模块
- 涉及资料对象
- 冲突说明
- 建议动作
- 证据链

### MED_001_需求受付 Module Checklist Example

| Module | Required | Purpose |
|---|---|---|
| 产品定义/PRD | 必传 | Convert product definition into structural design inputs |
| 使用场景 | 必传 | Identify environment, user actions, misuse, cleaning, drop and transport scenarios |
| 可靠性需求 | 必传 | Identify reliability targets such as drop, vibration, life, environment and packaging |
| 法规/医疗器械要求 | 必传 | Identify regulatory, registration, safety, material and patient/user-contact constraints |
| 清洁消毒要求 | 必传 | Identify cleaning method, disinfectant compatibility, dead corners and liquid ingress risks |
| 包装运输要求 | 选传 | Identify packaging, transport, stacking and shipping-drop constraints |
| 结构边界条件 | 必传 | Identify size, weight, interface, button, screen, sensor, label and assembly boundaries |
| 未确认需求清单 | 选传 | Track requirement gaps, owners, due dates and stage impact |

Module interpretation card should output:

- 模块名称
- 资料状态
- 已识别资料
- 核心内容摘要
- 结构相关判断
- 风险点
- 缺失项
- 需确认问题
- 建议动作
- 置信度
- 是否阻塞当前阶段

## Material Object Rules

Uploaded materials should be modeled as material objects, not just files.

Material object types:

- 单文件
- 文件夹
- 压缩包
- 批量文件

Deletion actions:

- 从本次审查移除: Remove the object only from the current review scope, keep it in the folder.
- 从分类文件夹删除: Move the object from the folder to recycle bin, keep logs and reports.
- 彻底删除: Permanently remove the stored object. This should require elevated permission and audit logging.

Recycle bin rules:

- Deleted material objects first enter recycle bin.
- Objects in recycle bin can be restored to their original project folder.
- Deleting or restoring must write an audit log.
- Reports, review records, and operation logs should not be deleted when a project or material object is soft-deleted.

## File Naming Rule

Recommended format:

```text
项目名称_阶段_资料类型_版本号_日期_状态.文件后缀
```

Example:

```text
血压仪项目_结构方案_结构方案说明_RevA_20260603_评审版.pptx
血压仪项目_DFM_供应商DFM报告_RevB_20260605_供应商版.pptx
血压仪项目_ECO_ECO申请单_RevA_20260610_待会签.docx
血压仪项目_DVT_跌落测试报告_RevA_20260615_已完成.pdf
```

## Naming Field Dictionaries

**Stage fields:** MED_000_项目基础信息、MED_001_需求受付、MED_002_ID设计、MED_003_结构方案、MED_004_详细设计、MED_005&007_00_试产、MED_005&007_01_ECN、MED_005&007_02_测试报告、MED_009_量产承认、Trouble list、其他。

**Version fields:** Use one consistent family within a project, such as `RevA/RevB/RevC` or `V1.0/V1.1/V2.0`.

**Date field:** Use `YYYYMMDD`.

**Status fields:** 草稿版、评审版、待确认、已确认、待会签、已会签、已关闭、最终版、供应商版、内部版。

## Naming Non-Compliance Output

When a file name is non-compliant, output:

| 原文件名 | 不符合项 | 推荐修改名称 | 是否允许继续分析 | 是否需要用户确认 |
|---|---|---|---|---|

Critical files may still be analyzed temporarily, but cannot be treated as officially archived if naming is non-compliant.

Critical files include BOM, drawings, DFM reports, ECO/ECN files, test reports, sign-off records, and final archive materials.

## Version Management

When multiple versions exist for the same stage and document type:

1. Use the latest version as the current effective file by default.
2. Determine latest version by version number, then date, then modification time, then user-specified effective version.
3. Do not delete old versions.
4. Old versions may be referenced for ECO comparison, design evolution, DFM before/after checks, test-failure correction comparison, and historical review.
5. If the latest version cannot be judged, mark `有效版本需确认`.

## Report Naming Rule

Report names should use the project name, reviewed folder name, review type, and date:

```text
项目名_审查文件夹名称_审查类型_时间
```

Example:

```text
智能助听器_MED_001_需求受付_完整审查_20260605
```

When reviewing a specific fixed folder, use that folder name in the report. When reviewing the whole project, use `全项目`.

## Stage Identification Keywords

| Stage | Evidence Keywords | Main Judgment |
|---|---|---|
| MED_000_项目基础信息 | 项目基本信息、产品定义、项目计划、产品型号 | Whether basic project identity and planning data are available |
| MED_001_需求受付 | PRD、用户需求、法规需求、可靠性需求、清洁消毒、产品定义 | Whether requirements can become structural design inputs |
| MED_002_ID设计 | ID效果图、三视图、外观尺寸、CMF、ID评审、丝印、图标 | Whether ID is ready for structural feasibility review |
| MED_003_结构方案 | 结构方案、爆炸图、关键截面、初版BOM、结构风险 | Whether the scheme is complete enough for review or detailed design |
| MED_004_详细设计 | 2D图纸、3D、STEP、PRT、关键尺寸、公差分析、详细BOM、Part list、材料规格、DFM | Whether drawings, BOM, materials, versions, and key dimensions are consistent |
| MED_005&007_00_试产 | EVT、DVT、PVT、试产、阶段评审、试产问题 | Whether trial production issues and structural risks are closed |
| MED_005&007_01_ECN | ECO、ECN、变更对比、影响分析、验证计划、会签 | Whether change reason, impact, validation, files, and approvals are sufficient |
| MED_005&007_02_测试报告 | 测试报告、跌落、振动、寿命、清洁消毒、包装运输、复测 | Whether test failures and validation items are closed |
| MED_009_量产承认 | 量产承认、最终BOM、最终图纸、检验标准、供应商承认、量产放行 | Whether mass production approval materials are complete |
| Trouble list | Trouble list、问题清单、行动项、关闭清单、未关闭项 | Whether issue tracking and closure evidence are sufficient |
| 其他 | 其他、临时资料、供应商沟通、未分类 | Whether materials require manual classification |

## Minimum Document Sets

| Stage | Minimum Documents |
|---|---|
| MED_000_项目基础信息 | 项目基本信息表、产品定义说明、项目计划或里程碑、产品型号/版本说明 |
| MED_001_需求受付 | PRD或产品定义、使用场景、可靠性需求、法规或医疗器械要求、清洁消毒或环境适应性要求 |
| MED_002_ID设计 | ID效果图、三视图或外观尺寸图、接口/按键/屏幕/指示灯位置说明、CMF或材料工艺初步方案、ID评审结论或待确认问题 |
| MED_003_结构方案 | 结构方案PPT、爆炸图或主要结构组成图、关键截面图、初版BOM、初步风险清单或评审记录 |
| MED_004_详细设计 | 2D图纸包、详细BOM或Part list、关键尺寸清单、材料规格书、公差或装配间隙分析、DFM/模具资料索引 |
| MED_005&007_00_试产 | EVT/DVT/PVT试产报告、试产问题清单、阶段评审记录、试产整改或验证记录 |
| MED_005&007_01_ECN | ECO/ECN申请或通知、变更前后对比、受影响零件/BOM/图纸版本、变更原因、验证计划或验证结论、会签记录 |
| MED_005&007_02_测试报告 | 结构相关测试报告、失败项清单、原因分析、复测或验证结论 |
| MED_009_量产承认 | 最终BOM、最终图纸包、检验标准、供应商承认资料、量产问题关闭记录、量产放行记录 |
| Trouble list | 问题清单、责任人、截止日期、关闭状态、关闭证据 |
| 其他 | 资料说明或人工分类结论 |

## Risk Level Definition

| 风险等级 | Definition |
|---|---|
| 高 | May affect safety, regulation, function, reliability, mass production, registration, or project milestone |
| 中 | May affect assembly, manufacturing, cost, appearance, or test pass rate and needs review confirmation |
| 低 | Has limited design impact and can be handled through normal optimization or file update |

## Stage Gate Standards

### 需求受付 -> ID设计/结构方案输入

Required:
- Product definition or PRD is available.
- Core use scenarios are described.
- Reliability, environment, cleaning, disinfection, or medical-device requirements are identified when applicable.
- Main boundary conditions that affect structure are known, such as product size, weight, interface, button, screen, patient/user contact area, and packaging/transport constraints.
- Open requirement gaps that may affect structure are listed as `需确认`.

### ID设计 -> 结构方案

Required:
- ID effect drawings, three views, or external dimensions are available.
- Main interface, button, screen, indicator, sensor, and label positions are identified.
- CMF or material/process direction is available or marked as pending.
- Potential structural feasibility risks are listed, such as parting line, wall thickness, cleaning dead corners, sealing, and assembly constraints.
- Any ID item that may affect safety, reliability, regulation, or manufacturability is marked for review.

### 结构方案 -> 详细设计

Required:
- Requirements are basically clear.
- Main ID dimensions and appearance are frozen.
- Main structural scheme is clear.
- Initial BOM is complete.
- Key risks are identified.
- No open high-risk requirement gaps.

### 详细设计 -> DFM/开模准备

Recommended:
- 2D drawing package, detailed BOM, key dimensions, material specifications, and tolerance or assembly-gap analysis are available.
- Drawing, BOM, and 3D version relationship is clear.
- Key inspection dimensions and technical requirements are defined.
- Materials, surface treatment, and appearance requirements are clear.
- High-risk structural issues are reviewed or explicitly listed as pending confirmation.

### DFM -> 开模

Recommended:
- Supplier DFM report is complete.
- High-risk DFM issues are reviewed.
- Structural changes are confirmed.
- Appearance surface, parting line, slider, lifter, ejector, and other key tooling issues are confirmed.
- Drawing or 3D version is clear.
- No open high-risk DFM issue.

### EVT -> DVT

Recommended:
- EVT issue list is complete.
- Structural failures and high-risk trial issues have cause analysis.
- Required design changes or ECO/ECN actions are identified.
- Retest or verification plan is available for structural issues.
- No open high-risk safety, reliability, or usability issue blocks DVT.

### DVT -> PVT

Recommended:
- DVT report is complete.
- Structural failure items are closed.
- ECO/ECN is signed off and verified.
- Key dimensions and assembly issues are confirmed.
- Trial production risk is evaluated.
- No open high-risk reliability issue.

### PVT -> MP

Recommended:
- PVT trial production report is complete.
- Production-line assembly issues are closed.
- Yield reaches target.
- Inspection standards are confirmed.
- Final BOM and drawing versions are frozen.
- Key supplier issues are closed.
- No open high-risk mass-production issue.

---

## Material Object Version Management

Each material object supports version tracking:

- `effectiveVersion`: the currently active version tag (e.g. RevA, V1.0).
- All versions are retained; old reports bind to the old version, new reviews use the effective version.
- To replace a file or upload a new version: use "替换/上传新版本" on the material detail page.
- To roll back to an older version: use "设为有效版本" on the version history tab.

Audit log records every version event: `material.replace_version`, `material.set_effective_version`.

---

## BOM / Drawing Correspondence Rules

For `MED_004_详细设计` and related stages, the system checks:

- **2D drawing prefix**: `HA1_DE` (e.g. `HA1_DE_Cover_RevA.dwg`)
- **3D drawing prefix**: `HA1_DE` or `HA1_CB`
- **BOM sheet priority**: first match the sheet name containing the same prefix (e.g. `HA1_DE`); if no exact match, auto-detect the most likely "Part list" sheet and mark as "需人工确认".
- **Column names**: BOM must have a column exactly named `2D图纸` and a column exactly named `3D图纸`.
- **Name matching**: ignore whitespace, case, and file extension.

Output six categories of issues:
1. BOM 中有记录但未上传图纸
2. 已上传图纸但 BOM 中未登记
3. 名称相似但不完全一致（相似度 60-99%）
4. 版本号冲突（同名项图纸版本与 BOM 版本不一致）
5. 2D/3D/BOM 三者缺一
6. 疑似同一零件但命名不规范

---

## AI Q&A Module

Two Q&A contexts are available:

### Project Q&A
- Scope: current project materials, module interpretation cards, reports, and risk list.
- Location: "项目AI问答" button inside the folder page review operations area.
- Permission: only accessible to users with project access.

### Global Knowledge Base Q&A
- Scope: all archived projects, typical issues, DFM cases, ECO cases, test failure closures, experience summaries.
- Location: floating "资料库问答" button visible on all pages.
- Permission: only returns data from projects the user has access to.

### AI Q&A Boundaries
- AI can only state "基于资料可判断 / 部分可判断 / 资料不足".
- AI cannot auto-approve, release, approve ECO, or close test failure items.
- Every answer includes evidence sources: project / folder / module / material / report / risk ID / interpretation timestamp.
- If data is insufficient, AI says so explicitly — it does not generate an answer for the sake of answering.

---

## Audit Log Dimensions

All following actions are recorded with timestamp, projectId, targetType, targetId, and message:

| Action key | Description |
|---|---|
| material.upload | 上传资料 |
| material.view | 查看资料 |
| material.replace_version | 替换/上传新版本 |
| material.modify_metadata | 修改元数据 |
| material.soft_delete | 删除/移入回收站 |
| material.restore | 恢复 |
| material.permanent_delete | 彻底删除 |
| material.remove_from_review | 从本次审查移除 |
| material.link_module | 绑定模块 |
| material.unlink_module | 解绑模块 |
| material.set_effective_version | 设置有效版本 |
| module.confirm | 人工确认模块 |
| report.generate | 生成报告 |
| ai_qa.reference | AI问答引用资料 |

---

## Association Relation View

The material detail page includes an "关联关系" tab showing where the material fits in the engineering chain:

```
BOM/Part list → 2D图纸 → 3D图纸 → ECO/ECN → 测试报告 → Trouble list
```

The full relation graph (accessible via "关联关系视图" in the folder page) shows all materials as typed nodes with labeled edges, allowing engineers to trace any part from BOM registration through design, change, testing, and issue tracking.

