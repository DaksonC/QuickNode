# Changelog

Version 2.0.0 rewrites QuickNode CLI with zero runtime dependencies, makes `qn create` safe by default, publishes with provenance and adds `qn generate`, `qn check`, `qn add`, `qn doctor`, `qn ui` and this site; it requires Node.js 22.13+.

Versions follow [semantic versioning](https://semver.org/). Release notes with the build provenance are on [GitHub Releases](https://github.com/DaksonC/QuickNode/releases).

## 2.0.0 // upcoming

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

Updated on 2026-11-15 · valid for v2.x · https://daksonc.github.io/QuickNode/changelog/

> Release notes of QuickNode CLI from v1.0.0 to v2: zero runtime dependencies, safe project generation, verifiable publishing and the documentation site.
