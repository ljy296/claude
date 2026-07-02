# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

KBase is a workspace for **mechanical structural project review** of medical devices and electronic products. It contains three coordinated but independently-runnable components plus the source design materials they were built from.

The three components share one domain model — a fixed project folder structure (`MED_000`–`MED_009`, `TROUBLE_LIST`, `OTHER`) representing the stages of a structural engineering project — but they do **not** call each other at runtime (the platform does not import or invoke the agent).

## Commands

PowerShell on the target machine blocks `npm.ps1`, so use `npm.cmd` for npm scripts. Node >= 22 is required (the agent runs `.ts` files directly via `--experimental-strip-types`, so no build step).

From the workspace root:

```powershell
npm.cmd run install:all       # install agent + platform deps
npm.cmd run typecheck          # typecheck agent + platform
npm.cmd run test               # runs agent tests only
```

Agent (`structural-review-agent/`):

```powershell
npm.cmd run agent:typecheck
npm.cmd run agent:test                         # vitest run (all tests)
npm.cmd run agent:dev -- "E:\path\to\project-package" "完整审查" --out reports --formats markdown,excel,word,pdf
```

Platform (`structural-review-platform/`, an npm workspaces monorepo):

```powershell
npm.cmd run platform:dev:api    # Express API on http://127.0.0.1:3001
npm.cmd run platform:dev:web    # Vite/React on http://127.0.0.1:5173
npm.cmd run platform:typecheck
npm.cmd run platform:test       # vitest, api workspace only
npm.cmd run platform:build:web
```

To run a single test, invoke vitest directly in the relevant package, e.g. `cd structural-review-agent && npx vitest run tests/documentExport.test.ts` (or pass a `-t "name"` filter).

## Architecture

### `.cursor/skills/structural-project-review/` — the source of truth for review logic
The Cursor skill is the human-authored rule base; the agent's code is a productization of it. `SKILL.md` holds the non-negotiable review rules; `REFERENCE_RULES.md`, `AGENT_MODULES.md`, `OUTPUT_TEMPLATES.md`, and `IMPLEMENTATION_ROADMAP.md` define folders/naming/stages/risk levels, the M0–M9 module breakdown, output templates, and the productization roadmap. When review behavior needs to change, this is usually where the canonical definition lives.

### `structural-review-agent/` — runnable M0–M9 review pipeline (TypeScript, ESM)
`src/agents/structuralReviewAgent.ts` is the **M0 orchestrator**: it reads the review mode and conditionally invokes modules in `src/modules/` (M1 fileIntake → M2 stageGate → M3 structuralRisk, plus M4 DFM, M5 ECO, M6 closureArchive, M7 knowledgeCapture, M8 userInteraction, M9 governance depending on mode). Review modes are `快速审查`, `完整审查`, `DFM专项`, `ECO专项`, `归档专项`, `会议准备`. `src/index.ts` is the CLI entry (recursively collects files → `tools/documentTool.ts` parses them → orchestrator → `tools/exportTool.ts` writes markdown/excel/word/pdf). Shared rules live in `src/rules/structuralRules.ts`; the skill text is loaded via `src/skills/loadSkill.ts`.

### `structural-review-platform/` — React + Express platform
npm workspaces: `apps/api` (Express + tsx), `apps/web` (React + Vite), `packages/review-core` (shared domain). The web app talks to the API at `VITE_API_BASE_URL` (default `http://127.0.0.1:3001`). `packages/review-core/src/projectStructure.ts` defines the **fixed folder list, folder/module statuses, and material types** — both api and web import this, so it is the single source for the project structure model.

**Persistence gotcha:** a Prisma schema (`apps/api/prisma/schema.prisma`, SQLite) and `dev*.db` files exist, but the live runtime in `apps/api/src/services/platformStore.ts` is an **in-memory store snapshotted to a JSON file** (`storage/platform-store.json`, overridable via `PLATFORM_STORE_PATH`). `getPersistenceStatus()` reports `mode: "json-snapshot"`. Prisma is scaffolded but not the active data layer — don't assume DB writes go through Prisma.

## Review-domain rules (apply when generating or editing review output)

These come from the skill and the workspace Cursor rules, and constrain any review content the code or Claude produces:

- Do **not** claim CAD interference checks, strength/mold-flow simulation, ECO approval, test closure, or mass-production release unless the source materials explicitly prove them.
- Every important statement must carry an evidence class (explicitly stated / context inference / visual suspicion / unknown) and a confidence label (`高`/`中`/`低`/`未知`). Mark unknowns as `需确认`; never invent dimensions, materials, test results, or approval status.
- Always flag for human confirmation: ECO/ECN approval, test-failure closure, regulatory/registration/IFU impact, high-risk issue closure, stage advancement, mass-production release, and writing to final archive records.

## Runtime artifacts (gitignored)

`structural-review-agent/reports/`, `structural-review-platform/storage/` (uploads, exported reports, the JSON store), the SQLite `*.db` files, and `apps/api/src/generated/prisma/` are treated as runtime data, not source. Don't version them unless explicitly asked. See `docs/MIGRATION_INVENTORY.md` for the full inventory and environment notes.
