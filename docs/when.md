# When to use QuickNode CLI, and when not to

Use QuickNode CLI to start an Express REST API in TypeScript or JavaScript with clean architecture, PostgreSQL, tests and linting, and to keep that architecture as it grows; do not use it for front ends, monorepos, NestJS projects or databases other than SQL.

## When is it a good fit?

- A new HTTP API in Node.js 22.13+ with Express, in TypeScript (TypeORM) or JavaScript (Sequelize).
- You want domain and infrastructure layers from day one, and a check (`qn check`) that keeps them apart in CI.
- You add features often and want them in the right layers: `qn generate crud` writes and wires them.
- PostgreSQL (with Docker Compose), or MySQL and SQLite through the same ORM.
- A small supply chain matters: the CLI has zero runtime dependencies and works offline.
- An AI agent does part of the work: every command runs without prompts, with `--json`, `qn schema` and an MCP server.

## When should I pick something else?

- Front ends, full-stack frameworks or static sites: QuickNode only creates back-end APIs.
- Monorepos with several services in one repository: each QuickNode project is a single package.
- You want NestJS modules, decorators and its DI container: use the [Nest CLI](https://docs.nestjs.com/cli/overview).
- Fastify, Koa or another HTTP framework, Prisma or MongoDB: they are not supported today.
- GraphQL or gRPC as the main interface: the templates are REST with OpenAPI.
- You need a large, mature community and long-term support guarantees: this is a young project with one maintainer.

## How do I decide quickly?

1. Preview without writing anything: `npx @10565/quicknode-cli@3 create my-api --typescript --dry-run`.
2. Read the [project structure](https://daksonc.github.io/QuickNode/structure/) and the [comparison with Nest CLI and a manual template](https://daksonc.github.io/QuickNode/compare/).
3. If the layers and tools match your needs, create the project; if not, nothing was written.

---

Updated on 2026-11-15 · valid for v3.x · https://daksonc.github.io/QuickNode/when/

> Clear criteria for choosing QuickNode CLI: use it for Express REST APIs with clean architecture and PostgreSQL; do not use it for front ends, monorepos, NestJS projects or other databases.
