# KBase Structural Review Workspace

This workspace contains a Cursor Skill, a runnable TypeScript review agent, and a local web platform for mechanical structural project review.

## Current Layout

```text
KBase/
  .cursor/skills/structural-project-review/   Cursor skill rules and review knowledge
  structural-review-agent/                    M0-M9 review agent, parsers, exporters, tests
  structural-review-platform/                 React + Express platform
  docs/                                       Migration notes and project inventory
```

Important source materials in the root include the original skill design notes, integrated Word design document, BOM workbook, and reference image.

## Quick Start

PowerShell on this machine blocks `npm.ps1`, so use `npm.cmd`:

```powershell
npm.cmd run install:all
npm.cmd run typecheck
npm.cmd run test
```

Set up the platform database (SQLite via Prisma) once before first run:

```powershell
copy structural-review-platform\apps\api\.env.example structural-review-platform\apps\api\.env  # 若尚无 .env（参考根目录 .env.example）
npm.cmd --prefix structural-review-platform/apps/api run prisma:generate
npm.cmd --prefix structural-review-platform/apps/api run prisma:push
```

Run the web platform in two terminals:

```powershell
npm.cmd run platform:dev:api
npm.cmd run platform:dev:web
```

Default URLs and login:

- API: `http://127.0.0.1:3001`
- Web: `http://127.0.0.1:5173`
- 首次启动 API 会自动创建默认管理员（`admin` / `admin12345`，见 `.env` 的 `SEED_ADMIN_*`）。登录后请尽快修改密码相关配置。所有 `/api/*` 接口（除 `/api/health` 与 `/api/auth/login`）均需登录后携带 `Authorization: Bearer <token>`。

Run the agent directly:

```powershell
npm.cmd run agent:dev -- "E:\path\to\project-package" "完整审查" --out reports --formats markdown,excel,word,pdf
```

## Verification

- Agent: `npm.cmd run agent:typecheck`, `npm.cmd run agent:test`
- Platform: `npm.cmd run platform:typecheck`, `npm.cmd run platform:build:web`, `npm.cmd run platform:test`
- All TypeScript checks from root: `npm.cmd run typecheck`
- All tests from root (agent + platform API): `npm.cmd run test`

## Runtime Data

The platform currently keeps large uploads, exported reports, SQLite dev databases, and generated Prisma client files inside the project tree. They are treated as runtime artifacts and ignored by the root `.gitignore`.

## Migration Notes

See `docs/MIGRATION_INVENTORY.md` for the project inventory, Cursor global configuration summary, recovered project memory, runtime-data boundary, and known environment notes.
