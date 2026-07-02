# KBase Migration Inventory

Generated on 2026-06-15 for `E:\CURSOR0\cursor\KBase`.

## Summary

This project is a local engineering knowledge/review workspace for structural project package review. It currently contains:

- A Cursor Skill rule base: `.cursor/skills/structural-project-review/`
- A runnable review agent: `structural-review-agent/`
- A local web platform: `structural-review-platform/`
- Real engineering uploads/reports under `structural-review-platform/storage/`
- Original design documents and sample BOM files in the workspace root
- An initialized Git repository on branch `main`

Git metadata is present in the project root. The current repository has an initial commit:

- `36853e784e600be83c149cc6acd92cd98352d497` - `Initialize KBase workspace`

The `git` CLI is still not available in the current shell environment, so repository checks were verified from `.git` metadata.

## Project Components

### Cursor Skill

Path: `.cursor/skills/structural-project-review/`

Key files:

- `SKILL.md`: skill entry and non-negotiable review rules
- `AGENT_MODULES.md`: M0-M9 module definitions
- `REFERENCE_RULES.md`: folder, naming, version, stage gate, risk, and minimum-document rules
- `OUTPUT_TEMPLATES.md`: review output templates
- `IMPLEMENTATION_ROADMAP.md`: productization roadmap
- `VALIDATION_REPORT.md`: scenario and rule coverage validation

Core rule intent:

- Review file completeness before judging design quality.
- Separate explicit evidence, context inference, visual suspicion, and unknown/manual-confirmation items.
- Do not claim CAD, simulation, mold-flow, approval, closure, or release conclusions without source evidence.

### Review Agent

Path: `structural-review-agent/`

TypeScript ESM project with tests and document export.

Scripts:

- `npm.cmd --prefix structural-review-agent run dev`
- `npm.cmd --prefix structural-review-agent run typecheck`
- `npm.cmd --prefix structural-review-agent test`

Notable implementation areas:

- `src/agents/structuralReviewAgent.ts`: orchestration
- `src/modules/`: M1-M9 review modules
- `src/tools/documentTool.ts`: DOCX/XLSX/PDF/PPTX/image/text parsing
- `src/tools/exportTool.ts`: Markdown/Excel/Word/PDF export
- `tests/`: Vitest coverage for agent and export flows

### Web Platform

Path: `structural-review-platform/`

React + Vite frontend and Express TypeScript API.

Scripts:

- `npm.cmd --prefix structural-review-platform run dev:api`
- `npm.cmd --prefix structural-review-platform run dev:web`
- `npm.cmd --prefix structural-review-platform run typecheck`
- `npm.cmd --prefix structural-review-platform run build:web`

Default ports:

- API: `127.0.0.1:3001`
- Web: `127.0.0.1:5173`

Current API surface includes:

- `GET /api/health`
- project CRUD and restore
- fixed project folders
- folder materials
- folder reviews
- material soft delete, restore, permanent delete, and remove-from-review
- recycle bin
- audit logs
- global AI QA

Prisma schema exists at `structural-review-platform/apps/api/prisma/schema.prisma`, using SQLite through `DATABASE_URL`.

## Runtime Data Boundary

The workspace contains substantial runtime/project data:

- `structural-review-platform/storage/`: 730 files, about 3.39 GB
- Root engineering files include BOM, design docs, and images
- Generated reports exist under both `structural-review-agent/reports/` and `structural-review-platform/storage/reports/`
- Uploads include STEP/STP, DXF, PDF, PPT/PPTX, XLS/XLSX, ZIP/RAR, AI/DWG and related project documents

Recommended source-control policy:

- Version source code, Cursor skill rules, docs, package locks, and root engineering bootstrap files only when intentionally needed.
- Do not version `node_modules`, generated reports, storage uploads, local SQLite DBs, or generated Prisma client files by default.

## Cursor Global Configuration Found

Read-only inspection found Cursor user data in:

- `C:\Users\lijia\AppData\Roaming\Cursor\User`
- `C:\Users\lijia\.cursor`

Relevant global settings:

- `terminal.integrated.defaultProfile.windows`: `Command Prompt`
- `files.autoSave`: `afterDelay`
- `deepseek.lang`: `cn`
- `python.defaultInterpreterPath`: `d:\app\python\python.exe`
- Cursor locale in `argv.json`: `zh-cn`
- User keybinding: `ctrl+i` mapped to `composerMode.agent`

Cursor global storage records this workspace as a recent/open folder:

- `file:///e%3A/CURSOR0/cursor/KBase`

Recent Cursor file history for this project includes:

- `structural-review-platform/README.md`
- `.cursor/skills/structural-project-review/REFERENCE_RULES.md`
- `structural-review-agent/tsconfig.json`
- `结构工程师项目评审Skill设计说明书_整合版.docx`

## Recovered Cursor Project Memory

Cursor plan files under `C:\Users\lijia\.cursor\plans` contain several historical plans relevant to this workspace:

- `web平台实施_da9de8f2.plan.md`: plan to wrap `structural-review-agent` into the current React + Express web platform. Todos are marked completed.
- `文档导出集成_686a3915.plan.md`: plan to add real document parsing and Markdown/Excel/Word/PDF export. Todos are marked completed.
- `结构知识库系统_2bc9ea32.plan.md`: earlier broader knowledge-base system plan.
- `扩展文件识别_42169ad1.plan.md`, `优化问答准确率_cf3e37c0.plan.md`, `深化ai问答_301d01c5.plan.md`: related AI QA and document-recognition planning from nearby knowledge-base work.
- `资料在线查看编辑_730c532f.plan.md`: related online preview/edit/versioning plan, but references another project path (`skh-system`) and should not be treated as implemented in KBase without code confirmation.

Some historical plan and README text appears mojibake in the terminal, but the project code and filenames still make the implementation shape clear.

## Verification Status

Checked on 2026-06-15:

- `npm.cmd run typecheck`: passed for the root workspace, review agent, API, and web app.
- `npm.cmd run test`: passed for the review agent, 2 test files / 2 tests.
- `npm.cmd run platform:build:web`: passed; Vite production build completed.
- API health check: `http://127.0.0.1:3001/api/health` returned `{"status":"ok","service":"structural-review-platform-api"}`.
- Web app check: `http://127.0.0.1:5173` returned HTTP 200.
- Prisma schema validation: passed when `DATABASE_URL=file:./dev.db` is provided.

## Local Environment Notes

- Node is installed: `v24.16.0`; npm is `11.13.0`.
- PowerShell blocks `npm.ps1`, so use `npm.cmd`.
- `git` was not found in the shell, even though the project already has Git metadata and an initial commit.
- Both child projects already have `node_modules` and `package-lock.json`.
- No root `.env` file was found. `.env.example` documents the expected local variables, including `DATABASE_URL`.

## Initialization Added

The workspace root now has:

- `package.json`: root scripts for install, test, typecheck, agent, and platform commands
- `.gitignore`: ignores dependencies, build outputs, generated reports, platform storage, local DBs, and generated Prisma client
- `.env.example`: shared environment template
- `.cursor/rules/project.mdc`: root Cursor project rules
- `README.md`: unified workspace entry point

## Suggested Next Steps

1. Install Git CLI or add it to PATH if you want normal `git status`, commit, branch, and remote commands from this shell.
2. Decide whether the root BOM/design documents should be versioned or moved to runtime/sample data.
3. Decide whether platform storage should be backed up separately before any repository cleanup.
4. Create a local `.env` from `.env.example` if Prisma CLI commands or API scripts need explicit environment variables outside the already running service.
5. Run `npm.cmd run typecheck` and `npm.cmd run test` after any dependency refresh.
