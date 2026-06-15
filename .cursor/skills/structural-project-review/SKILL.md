---
name: structural-project-review
description: Review mechanical structural engineering project packages for medical devices and electronic products. Use when the user uploads or references project files, structural design documents, DFM reports, ECO/ECN materials, test reports, meeting minutes, archive packages, or asks for structural project review, stage gate review, DFM parsing, ECO impact analysis, or issue closure checks.
---

# Structural Project Review

## Purpose

Assist mechanical structural engineers with project package intake, stage identification, document completeness review, structural risk review, DFM issue extraction, ECO/ECN impact analysis, test and action-item closure checks, archive review, and reusable knowledge capture.

This skill supports engineering review. It does not replace final decisions by structural engineers, quality, regulatory, registration, tooling, testing, or project management owners.

## Non-Negotiable Rules

1. Review files and document completeness before judging design quality.
2. Do not claim real CAD interference checks, strength simulation, mold-flow analysis, or full 3D inspection unless those results are explicitly provided in the input materials.
3. Separate every important statement into one of four source classes: explicitly stated, inferred from context, visually suspected, or unknown and requiring confirmation.
4. Mark unknown items as `需确认`; do not invent dimensions, materials, test results, approval status, or closure conclusions.
5. Ask at most 5 to 10 supplemental questions per pass, and only ask questions that affect stage judgment, structural risk judgment, or DFM/ECO/test closure.
6. Preserve traceability: include project name, review mode, report version, generation time, input file scope, evidence, confidence, and manual confirmation items.

## Default Workflow

Follow this order for project package review:

1. Identify file structure, file types, naming patterns, versions, and likely duplicates.
2. Identify project stage from folder names, file names, and content keywords.
3. Check the minimum document set for the identified stage.
4. Summarize what the AI understands, what is missing, and what is uncertain.
5. Run stage gate review for the current phase.
6. Run structural risk review from the structural engineer responsibility view.
7. Run DFM, ECO/ECN, testing, meeting action item, and archive checks when related materials exist.
8. Produce supplemental questions and next actions.
9. If the user later provides more materials, generate a new report version instead of overwriting the previous result.

## Review Modes

Choose the narrowest mode that satisfies the user request:

- `快速审查`: Highlight missing key files, high risks, version conflicts, and urgent confirmations.
- `完整审查`: Run the full workflow and produce the standard project review report.
- `DFM专项`: Extract DFM issues, classify risks, prepare meeting topics and supplier reply suggestions.
- `ECO专项`: Analyze change reason, impact scope, verification needs, affected files, approvals, old material handling, and approval recommendation.
- `归档专项`: Check final BOM, drawings, DFM/ECO closure, test reports, issue closure, and lessons learned.
- `会议准备`: Produce prioritized meeting agenda, open questions, decision points, and owner/action suggestions.

## Trigger Scenarios

Apply this skill when the user:

- Uploads a project package and asks for structural project review.
- Uploads a structural scheme PPT and asks whether it is ready for review or detailed design.
- Uploads a DFM PPT/PDF/report and asks to extract DFM issues, risks, and meeting topics.
- Uploads ECO/ECN materials and asks for change impact analysis.
- Uploads test reports, issue lists, or meeting minutes and asks whether structural issues are closed.
- Uploads archive materials and asks to check completeness or summarize lessons learned.
- Asks whether a project stage can move to the next stage under structural-engineering responsibilities.

## Core Modules

Use the module definitions in [AGENT_MODULES.md](AGENT_MODULES.md) when the user asks to build separate agents or sub-agents.

Use [REFERENCE_RULES.md](REFERENCE_RULES.md) for folder structure, naming rules, version rules, project stages, minimum document sets, risk levels, and stage gate standards.

Use [OUTPUT_TEMPLATES.md](OUTPUT_TEMPLATES.md) for report, DFM, ECO, closure, supplemental-question, and knowledge-base output formats.

Use [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) when the user wants to implement this as a product, workflow, or multi-agent system.

## Output Requirements

Default to structured Markdown. Use tables for checklists and issue lists when helpful.

Every review report should include:

1. Project stage identification.
2. File completeness review.
3. Naming, version, duplicate, and suspected outdated file issues.
4. AI-understood structural information.
5. Stage gate judgment.
6. Structural risk list.
7. DFM/ECO/test/action-item closure state when applicable.
8. Supplemental questions with reasons and impact.
9. Next-step recommendations.

## Confidence Labels

Use these confidence labels:

- `高`: Explicitly stated in materials, or confirmed by multiple consistent files.
- `中`: Indirectly supported but missing a full explanation.
- `低`: Inferred from images, file names, or limited context only.
- `未知`: Cannot be judged from current materials.

## Human Confirmation Required

Always mark these as requiring human confirmation:

1. ECO/ECN approval conclusion.
2. Test failure closure conclusion.
3. Regulatory, registration, risk-management, label, or IFU impact.
4. High-risk structural issue closure.
5. Permission to enter the next project stage.
6. Permission for mass production or transfer to production.
7. Permission to write results into final archive records.
