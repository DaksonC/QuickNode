# QuickNode CLI

To create a Node.js API with clean architecture, run `npx @10565/quicknode-cli create my-api`: you get Express, TypeScript or JavaScript, PostgreSQL, tests, linting and Git hooks, already wired in domain and infrastructure layers._

@10565/quicknode-cli is a zero-dependency CLI to create Node.js APIs with clean architecture. The CLI itself is a single npm package built only on Node.js APIs: nothing else is downloaded when you run it.

Not to be confused with QuickNode, the blockchain infrastructure provider: this is an open source scaffolding tool, always installed by its scoped name `@10565/quicknode-cli`. Using an AI assistant? See [QuickNode for AI agents](https://daksonc.github.io/QuickNode/agents/).

```
$ npx @10565/quicknode-cli create my-api --typescript
$ cd my-api
$ npm install
$ npm run docker:up
$ npm run dev
```

## What do you get?

- Clean architecture: entities, repository interfaces and use cases in `src/domain`; Express, the database and logging in `src/infrastructure`. [See the structure](https://daksonc.github.io/QuickNode/structure/).
- Two templates: TypeScript (Express, TypeORM, class-validator, tsx) or JavaScript (Express, Sequelize, `node --watch`).
- Ready to run: PostgreSQL on 127.0.0.1 through Docker Compose, Swagger at `/api-docs`, a health route, structured logs with pino and helmet headers.
- Quality tools: Jest, ESLint 10, Prettier, Husky 9 and commitlint, with an example CRUD and its tests.
- Safe by default: never writes into a non-empty folder without `--force`, rejects unsafe names, generates random secrets in a git-ignored `.env` and shows the plan with `--dry-run`.

## Why zero dependencies?

Every dependency of a CLI is code that runs on your machine. QuickNode uses only Node.js 22.13+ APIs (`util.parseArgs`, `util.styleText`, `readline`, `fs`), so `npx` installs one small package, with no install scripts. Releases are published from GitHub Actions with npm provenance, so each version can be traced to a commit. The reasoning is in [ADR-001](https://daksonc.github.io/QuickNode/adr/001/).

## Where to go next?

- [Getting started](https://daksonc.github.io/QuickNode/start/): requirements and the first API in five steps.
- [Command reference](https://daksonc.github.io/QuickNode/commands/): every command and flag.
- [Add an entity and a use case](https://daksonc.github.io/QuickNode/tutorial/) in the right layers.
- [QuickNode, Nest CLI or a manual template?](https://daksonc.github.io/QuickNode/compare/)

From a terminal, `qn ui` opens these pages and `qn help create` shows the same help offline.

---

Updated on 2026-11-15 · valid for v3.x · https://daksonc.github.io/QuickNode/

> Create a Node.js API with clean architecture in one command: Express, TypeScript or JavaScript, PostgreSQL, tests and linting ready. Zero runtime dependencies.
