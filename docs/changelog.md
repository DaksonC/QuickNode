# Changelog

Version 3.0.0 records how each project was created in `quicknode.json`, adds `--db postgres|sqlite|none` and presets to `qn create`, and brings `qn env` and `qn upgrade`; it also ships the rewrite planned as 2.0.0, which was never published: zero runtime dependencies and a safe `qn create`. It requires Node.js 22.13+.

Versions follow [semantic versioning](https://semver.org/). Release notes with the build provenance are on [GitHub Releases](https://github.com/DaksonC/QuickNode/releases).

## 3.0.0 // 2026-11-16

### Breaking changes

- The generated database code has one shape for every database: `src/infrastructure/database/connection` exports `databaseConnection` with `initialize()`, `ping()` and `close()`. In JavaScript projects it replaces the default export `sequelizeConnection` and the models are loaded by `initialize()`.
- The connection is PostgreSQL only: `DB_TYPE` and the half-supported MySQL and SQLite branches are gone (use `--db sqlite`). `@types/sqlite3` left the TypeScript template.
- The commands written into new projects and docs use `npx @10565/quicknode-cli@3`.
- The size budget of the published package is 400 KB (was 300 KB), recorded in ADR-001 D4.
- `qn create` asks for the database in a terminal (`--yes` and `--preset` skip the question).

### Added

- `quicknode.json` in new projects: template, database, package manager, test runner, layer folders, template version and the hash of every generated file. `qn generate`, `qn add`, `qn check`, `qn doctor` and `qn upgrade` read it; projects without it are still detected by their layout.
- `qn create --db postgres|sqlite|none`: templates made of a small base plus one database add-on. SQLite uses `node:sqlite`, built into Node.js (no driver, no Docker); `none` uses in-memory repositories. `qn generate` writes the repository for the project's database.
- `qn create --preset api-minima|api-postgres` or `--preset ./file.json`, validated before anything is written; flags win over the preset.
- `qn env`: compares `.env` with `.env.example` by name and, with `--generate-secrets`, adds what is missing with random secrets (`crypto.randomBytes`). It never prints values.
- `qn upgrade`: applies a newer template. Files you did not change are updated, changed files get a diff and a `.qn-new` copy, `package.json` only gets newer versions of the dependencies it has; `--dry-run` first, confirmation (or `--yes`) to apply.
- Error codes `E_CONFIG_INVALID`, `E_PRESET_INVALID`, `E_ENV_EXAMPLE_MISSING`, `E_CONFIRM_REQUIRED` and `E_CLI_OUTDATED`; MCP tools `qn_env` and `qn_upgrade` (dry run unless `"apply": true`).
- `qn doctor` skips Docker when the project has no PostgreSQL and says when `qn upgrade` has something new.

### Fixed

- The TypeScript template crashed on start with `NODE_ENV=development`: `pino-pretty` was missing from its dependencies.
- JavaScript template: a missing user answered 500 instead of 404 (and a duplicate email 500 instead of 409); domain errors are now typed and mapped to HTTP codes.
- `qn ui` on WSL said it opened the browser but nothing opened; it now uses the Windows browser through `explorer.exe`.
- Running `qn generate` twice could insert the same wiring again when the snippet had blank lines.

## 2.0.0 // not published: these changes ship in 3.0.0

### Breaking changes

- Requires Node.js 22.13 or newer, for the CLI and the generated projects.
- Without a terminal, `qn create` no longer prompts: pass the name and `--typescript`/`--javascript`, or `--yes`.
- A non-empty target folder is refused unless `--force` is given.

### Added

- `qn generate <type> <name>` (alias `qn g`): entity, repository, use cases with a test, controller and route of a feature in the right layers, already wired; `--only`, `--no-test`, `--dry-run`.
- `qn check`: fails when `src/domain` imports infrastructure, Express, an ORM or another package; readable output or `--json`, exit code 1 for CI.
- `qn add <recipe>`: auth (JWT with `node:crypto`), healthcheck, rate-limit, graceful-shutdown, docker, ci, agents, eslint, husky, swagger and tests, idempotent, with `--dry-run` showing the diff.
- `qn doctor`: checks Node.js, `.env`, Docker, `npm audit` and the dependency rule.
- `AGENTS.md` and `CLAUDE.md` in new projects, for AI coding assistants; `npm run check` script; `docs/adr/` with a template for architecture decisions.
- For AI agents: `qn schema` (also `qn --help --json`) with the full specification; stable error codes (`E_USAGE`, `E_DIR_NOT_EMPTY`…) with a `fix`; `schemaVersion` in every JSON output; `qn mcp`, an MCP server on stdio that plans by default; `llms.txt`, `llms-full.txt` and every page in Markdown.
- `--dry-run`, `--yes`, `--force`, `--json`, `--git`, `--install`, `--no-credits`, `--pm npm|pnpm|yarn` and `--test jest|node` on `qn create`.
- `qn ui [topic]` (alias `qn docs`) opens this documentation; `qn help <command>` with examples.
- Random `DB_PASSWORD` and `JWT_SECRET` in a git-ignored `.env`.
- Bilingual documentation site, with the command reference generated from the CLI.
- Publishing from GitHub Actions with npm provenance and an SBOM; `SECURITY.md`.

### Changed

- Zero runtime dependencies: chalk, commander, figlet, fs-extra, inquirer and ora replaced by Node.js APIs (56 installed packages down to 1).
- Templates without frozen lockfiles and with updated dependencies: 0 high or critical vulnerabilities at release time; ESLint 10, Husky 9, Postgres bound to 127.0.0.1.
- Published package down from 1.6 MB to under 300 KB.
- Generated projects: each feature is wired in `infrastructure/modules`; TypeScript DTOs moved from the domain to `infrastructure/http/dtos`; tests use in-memory repositories and `node:assert`, so they run on Jest and `node:test`.

### Fixed

- Existing files (such as your README) were silently overwritten.
- Names such as `../escaped` created the project outside the current folder.

## 1.1.1 // 2025-09-28

- npm funding information; `.gitignore` included in new projects.

## 1.1.0 // 2025-09-28

- Database-agnostic templates with TypeORM (TypeScript) and Sequelize (JavaScript); dependency injection overhaul.

## 1.0.1 // 2025-09-21

- Package renamed to @10565/quicknode-cli with the `qn` command; new banner.

## 1.0.0 // 2025-09-18

- First release: `create` with TypeScript and JavaScript templates.

---

Updated on 2026-11-16 · valid for v3.x · https://daksonc.github.io/QuickNode/changelog/

> Release notes of QuickNode CLI from v1.0.0 to v3: zero runtime dependencies, safe project generation, verifiable publishing and the documentation site.
