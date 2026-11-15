# qn add recipes

To add a tool to an existing QuickNode project, run `qn add <recipe>` inside it, for example `qn add docker`: the recipe writes its files, merges `package.json` and wires the code, and running it again changes nothing.

## How does it behave?

1. Preview first: `qn add auth rate-limit --dry-run` prints a unified diff of every file it would create or change, and writes nothing.
2. Apply: `qn add auth rate-limit`. Several recipes can be given at once.
3. Install what changed: the output says when `package.json` got new dependencies (`npm install`).

- Idempotent: a recipe already in place is reported as `already in place, nothing to do`.
- Non-destructive: a file you changed is not overwritten without `--force`, and a `package.json` value you changed is kept (the output says so).
- Code is inserted before marker comments of the template, such as `// qn:middleware`. If you removed a marker, the output shows the lines to add by hand.
- Recipes are data inside the CLI package: no download while they run, and no new dependency in your project for `auth` and `rate-limit`, which use Node.js APIs only.
- Works without prompts, also with `--json`, in CI and for AI agents.

## Which recipes are there?

- **auth**: JWT authentication (HS256) written with `node:crypto`: `signToken`, `verifyToken` and an `authenticate()` middleware; the secret comes from `JWT_SECRET` in `.env` and weak secrets are refused. With tests.
- **healthcheck**: Liveness (`/health/live`) and readiness (`/health/ready`, 503 when the database does not answer) routes, wired in the server.
- **rate-limit**: Requests per client and time window, in memory, with `RateLimit-*` and `Retry-After` headers; `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` in `.env`.
- **graceful-shutdown**: On SIGTERM/SIGINT: stop accepting connections, finish requests in flight, close the database, with a timeout (`SHUTDOWN_TIMEOUT_MS`).
- **docker**: Multi-stage `Dockerfile` that installs production dependencies only and runs as the unprivileged `node` user, with a health check; `npm run docker:build`.
- **ci (also github-actions)**: GitHub Actions workflow with lint, tests, build, `qn check` and `npm audit`, actions pinned by commit SHA.
- **agents**: `AGENTS.md` and its copy `CLAUDE.md`, which tell AI coding assistants about the layers, the dependency rule and the commands to run.
- **eslint, husky, swagger, tests**: Come with every new project; the recipes put them back in a project where they were removed, with the template's files and versions.

Recipes follow the package manager of the project (npm, pnpm or yarn) and its test runner (Jest or `node:test`). Next: the [command reference](https://daksonc.github.io/QuickNode/commands/#add) and [how to add a feature with qn generate](https://daksonc.github.io/QuickNode/tutorial/).

---

Updated on 2026-11-14 · valid for v2.x · https://daksonc.github.io/QuickNode/add/

> qn add recipes for QuickNode projects: JWT auth, health checks, rate limit, graceful shutdown, Docker, GitHub Actions and AI agent instructions, idempotent and with --dry-run.
