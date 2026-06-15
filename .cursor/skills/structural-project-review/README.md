# 结构项目资料审查与风险评审 Skill

This folder contains a ready-to-use Cursor project Skill and the module materials needed to build a multi-agent structural engineering review assistant.

The content has absorbed both the original text design note and the integrated `.docx` version, keeping the text version's detailed engineering rules and the `.docx` version's product workflow, trigger scenarios, UI flow, export, governance, feedback, and rule-iteration content.

## Files

- `SKILL.md`: Cursor Skill entry file. Keep this concise so the agent can load it efficiently.
- `AGENT_MODULES.md`: Multi-agent module definitions and reusable prompts.
- `REFERENCE_RULES.md`: Engineering rules, document standards, naming/version rules, stage rules, minimum document sets, risk levels, and stage gates.
- `OUTPUT_TEMPLATES.md`: Report, DFM, ECO, closure, supplemental-question, and knowledge-base templates.
- `IMPLEMENTATION_ROADMAP.md`: Productization roadmap, UI entry points, review modes, and versioning rules.
- `VALIDATION_REPORT.md`: Rule coverage validation, typical scenario simulation, stability conclusion, and remaining gaps.

## Agent Module Map

- `M0`: Orchestrator and report merge.
- `M1`: File intake, naming, version, and traceability.
- `M2`: Stage identification and gate review.
- `M3`: Structural risk review.
- `M4`: DFM issue parsing and review.
- `M5`: ECO/ECN impact review.
- `M6`: Test, meeting action, and archive closure.
- `M7`: Knowledge capture and lessons learned.
- `M8`: User interaction, UI flow, progress display, and export.
- `M9`: Governance, feedback, audit log, and rule iteration.

## Recommended First Use

Ask Cursor:

```text
使用 structural-project-review skill，按完整审查模式审查这个结构项目资料包。
先做文件完整性和阶段识别，再输出结构风险、DFM/ECO/测试闭环状态、补充问题和下一步建议。
```

For DFM:

```text
使用 structural-project-review skill，按 DFM 专项模式解析供应商 DFM 报告，输出 DFM 问题台账、风险等级、需确认问题和会议讨论清单。
```

For ECO:

```text
使用 structural-project-review skill，按 ECO 专项模式评审这次 ECO/ECN 变更，输出影响范围、验证建议、文件更新清单和会签建议。
```
