# Implementation Roadmap

## Target Product Name

Recommended name:

```text
结构项目资料审查与风险评审助手
```

Alternative name:

```text
结构工程师项目评审助手
```

Use the recommended name if the scope includes DFM, ECO, test closure, and archive review.

## Product Description

Upload structural project packages, structural scheme PPTs, DFM reports, ECO/ECN materials, test reports, meeting minutes, or issue ledgers. The assistant identifies project stage and document type, reviews file completeness, version consistency, stage gate readiness, structural risks, DFM issues, ECO impact scope, test closure state, and archive readiness, then outputs supplemental questions and next-step recommendations.

The assistant does not replace final judgment by structural engineering, quality, regulatory, tooling, testing, or project-management owners. Unknown or unproven items must be marked as requiring confirmation.

## First Version Scope

Prioritize:

1. Project folder structure review.
2. Current stage identification.
3. Document completeness check.
4. Structural scheme PPT pre-review.
5. DFM PPT issue extraction.
6. ECO impact analysis.
7. Test, meeting, and issue closure checks.
8. Fixed-format review report.
9. Table-based output.
10. Supplemental questions and new report version after user updates.

Do not include in V1:

1. Native CAD 3D automatic reading.
2. Real interference checking.
3. Strength simulation.
4. Mold-flow analysis.
5. PLM, ERP, or QMS integration.

## Suggested Workflow Implementation

```text
User Upload / User Request
        |
        v
Fixed Folder
        |
        v
Module Checklist
        |
        v
Module-Level Interpretation Cards
        |
        v
Stage-Level Review
        |
        v
M0 Orchestrator consumes module results
        |
        +--> M1 File Intake And Traceability
        +--> M2 Stage Identification And Gate Review
        +--> M3 Structural Risk Review
        +--> M4 DFM Review
        +--> M5 ECO ECN Impact Review
        +--> M6 Closure And Archive
        +--> M7 Knowledge Capture
        +--> M8 User Interaction And Export
        +--> M9 Governance Feedback And Rule Iteration
        |
        v
Report Builder: Module Summary + M0-M9 Integrated Conclusion
        |
        v
User Confirmation / Supplemental Materials
        |
        v
New Report Version
```

## UI Entry Points

| Entry | Button Text | Use Case |
|---|---|---|
| 项目列表 | 新建项目 | Create a new project |
| 项目列表 | 删除/移除项目 | Soft-delete a project while preserving review records, reports, and audit logs |
| 项目详情 | 固定目录页 | Show the fixed MED folder template before any upload action |
| 分类文件夹 | 上传文件/文件夹 | Upload material objects into the selected folder |
| 分类文件夹 | 查看资料 | View material objects in the selected folder |
| 分类文件夹 | 开始审查 | Run review for the selected folder |
| 分类文件夹 | 历史报告 | View reports generated from the selected folder |
| 分类文件夹 | 缺失项提示 | Show missing materials and supplemental questions |

## Fixed Project Folder Page

After entering a project, the user should first see this fixed folder template:

```text
MED_000_项目基础信息
MED_001_需求受付
MED_002_ID设计
MED_003_结构方案
MED_004_详细设计
MED_005&007_00_试产
MED_005&007_01_ECN
MED_005&007_02_测试报告
MED_009_量产承认
Trouble list
其他
```

Users click a folder before uploading, deleting, reviewing, or generating reports.

After entering a folder, show three areas:

1. Module checklist: every module has a status and can be independently interpreted.
2. Material object area: users upload files, folders, archives, or batch files to a module. A material object can be referenced by multiple modules.
3. Review operation area: deep-interpret current module, review whole folder, generate formal report, view historical reports, and view missing items.

Module status flow:

```text
未上传 -> 已上传 -> 已解读 -> 需补充/有风险 -> 人工已确认
```

AI cannot set `人工已确认`; only the user can confirm.

Module-level review and M0-M9 are not alternatives:

- Module-level review reads each small module deeply and creates structured intermediate conclusions.
- Stage-level review judges whether the folder/stage is complete, risky, and ready to proceed.
- M0-M9 integrated review consumes module results first, then generates formal risk, DFM, ECO, test closure, stage gate, archive, knowledge and governance conclusions.

Each folder has an independent status:

| Status | Meaning |
|---|---|
| 未上传 | No material object exists |
| 已上传 | Material exists, review has not started |
| 待审查 | Materials are ready for review |
| 审查中 | A review job is running |
| 已出报告 | Reports exist |
| 需补充 | Missing or uncertain items require user action |

## Project Deletion

Project deletion should be a soft delete:

- Hide the project from default project lists.
- Preserve uploaded material records, review jobs, reports, and audit logs.
- Allow administrators to view deleted projects.
- Optional recovery can be added later.

## Material Object And Recycle Bin

Uploads are material objects. A material object can be:

- Single file.
- Folder.
- Zip/archive.
- Batch files.

Delete actions:

| Action | Meaning |
|---|---|
| 从本次审查移除 | Remove from current review scope only |
| 从分类文件夹删除 | Move to recycle bin |
| 彻底删除 | Permanently delete, admin permission required |

Recycle bin:

- Supports restore to original project folder.
- Keeps audit logs for delete and restore.
- Does not delete historical reports or review records.

## User Operation Flow

1. Enter project list.
2. Create a project or open an existing project.
3. Project detail page shows the fixed MED folder template.
4. User enters one folder, such as `MED_001_需求受付`.
5. Folder page shows upload, materials, start review, historical reports, and missing item prompts.
6. User uploads material objects into the selected folder.
7. AI reviews only the selected folder or the whole project if the user chooses `全项目`.
8. Report name uses `项目名_审查文件夹名称_审查类型_时间`.
9. User can remove material from the current review, move material to recycle bin, permanently delete, or restore.
10. Report is archived and high-frequency issues are captured.

## Basic UI Fields

| Field | Required | Notes |
|---|---|---|
| 项目名称 | Recommended | Used in reports and traceability |
| 产品型号 | Recommended | Matches BOM, drawings, and test reports |
| 当前阶段 | Optional | Can be identified by AI |
| 产品类型 | Recommended | Medical device, electronic product, or other |
| 是否医疗器械 | Required | Affects regulatory and validation checks |
| 是否量产 | Recommended | Affects ECO depth |
| 审查模式 | Required | Quick, full, DFM, ECO, archive, or meeting preparation |

## Upload Area Prompt

```text
请上传项目结构资料包或单项资料文件。
支持结构方案 PPT、DFM 报告、ECO 资料、BOM、图纸 PDF、测试报告、会议纪要和问题清单。
系统将优先基于已有资料自动识别和整理信息，不要求用户手动填写完整表格。
```

## Review Process Display

Show concrete progress steps:

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

## Result Page Prompt

```text
以下结果为基于当前上传资料的辅助审查结论，不替代结构工程师、质量、法规、测试或模具人员的最终判断。
请优先关注高风险项、未闭环项和需补充确认的问题。
```

## Export Formats

| Format | Use |
|---|---|
| Word | 正式审查报告 |
| Excel | 问题清单、DFM 台账、ECO 影响表 |
| PPT | 评审会议汇报 |
| Markdown | ChatGPT 或平台内直接展示 |
| PDF | 归档报告 |

## Review Modes

| Mode | Use Case | Output Focus |
|---|---|---|
| 快速审查 | Few files or quick issue scan | Missing documents and high risks |
| 完整审查 | Stage review | Full report |
| DFM专项 | DFM PPT/report parsing | DFM issue ledger |
| ECO专项 | Change review | Impact analysis and validation suggestions |
| 归档专项 | End of project | Completeness and lessons learned |
| 会议准备 | Before review meeting | Agenda and question list |

## Human Confirmation State Flow

```text
AI 初步识别
结构工程师已确认
质量已确认
法规已确认
项目经理已确认
已关闭
```

## Report Versioning

Recommended report name:

```text
项目名_审查文件夹名称_审查类型_时间
```

Module-level report name:

```text
项目名_阶段文件夹名称_模块名称_审查类型_时间
```

Examples:

```text
智能助听器_MED_001_需求受付_完整审查_20260605
智能助听器_MED_001_需求受付_可靠性需求_模块深度解读_20260608_1036
智能助听器_MED_004_详细设计_DFM专项_20260605
智能助听器_MED_005&007_01_ECN_ECO专项_20260605
```

Generate a new report version whenever the user provides supplemental answers, uploads additional files, or corrects AI recognition results.

Module-level interpretation cards are platform-first outputs. They should not be exported as formal documents by default. Formal archive outputs remain stage reports and project-level reports unless the user explicitly exports a module report.

## V2 Direction

Add automatic generation of:

1. DFM issue Excel ledger.
2. ECO impact analysis table.
3. Structural review meeting minutes.
4. Supplier reply email.
5. Project risk weekly report.

## V3 Direction

Integrate enterprise systems:

1. PLM.
2. BOM system.
3. QMS.
4. Test database.
5. Project management system.
6. Document management system.

## V4 Direction

Build a company-level knowledge base:

1. Structural design standard Q&A.
2. Historical DFM issue search.
3. Historical ECO cause analysis.
4. Failure case search.
5. Automatic risk reminders for new projects.

## Internal Decisions Still Needed

Confirm internally before production use:

1. Permission and confidentiality policy.
2. Sensitive data redaction rules.
3. Official file naming dictionary.
4. Stage entry and exit standards.
5. Detailed risk-level criteria.
6. ECO/ECN approval flow.
7. Quality, regulatory, and registration decision boundaries.
8. Report archive location.
9. Knowledge-base owner.
10. Skill rule-update approver.
11. Whether AI review reports can become formal quality records or only auxiliary materials.
