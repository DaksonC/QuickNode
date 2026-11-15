# QuickNode {{qn:language}} API

A Node.js {{qn:language}} API with clean architecture, created with [QuickNode](https://daksonc.github.io/QuickNode/).

## 🚀 Features

- **Clean Architecture**: domain and infrastructure layers, checked by `qn check`
- **Express** with Helmet security headers and centralized error handling
- **Database**: {{qn:dbFeature}}
- **API Documentation**: Swagger/OpenAPI 3.0 at `/api-docs`
- **Validation**: {{qn:validation}}
- **Logging**: structured logging with Pino
- **Tests, lint and hooks**: tests, ESLint (flat config), Prettier, Husky and commitlint
- **Development**: hot reload with {{qn:devReload}}

## 📁 Project Structure

```
src/
  domain/                  business rules: entities, repository interfaces, use cases
  infrastructure/          controllers, routes, database, docs, logging, middleware
{{qn:dtosFolder}}
{{qn:dbFolders}}
    modules/               wiring of each feature: repository -> use cases -> controller -> routes
  server.{{qn:ext}}                application entry point
```

## 📋 Requirements

- Node.js 22.13 or newer (`.env` is loaded with the native `process.loadEnvFile()`, no dotenv)
{{qn:dbRequirement}}

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Review `.env`: `qn create` generated it (git-ignored) from `.env.example`, with random
secrets. Never commit it. If you cloned the project instead, create it with random secrets:
```bash
npx @10565/quicknode-cli@3 env --generate-secrets
```
`npx @10565/quicknode-cli@3 env` lists missing or extra variables without printing values.

3. Git hooks (Husky 9) are installed by `npm install` once the folder is a git repository
(`qn create --git` already ran `git init`). Otherwise: `git init && npm run prepare`.

## 🏃‍♂️ Usage

```bash
npm run dev            # development server with hot reload
{{qn:startCommand}}
npm test               # tests (also test:watch and test:coverage)
npm run lint           # lint (lint:fix and format fix it)
npm run check          # dependency rule (qn check)
```

## 🗄️ Database

{{qn:dbReadme}}

## 📖 API

With the server running: Swagger UI at http://localhost:3000/api-docs and a health check at
http://localhost:3000/health.

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
curl http://localhost:3000/api/v1/users
```

## ➕ Adding Features

Generate a feature with every layer already wired, then add its fields:

```bash
npx @10565/quicknode-cli@3 generate crud product --dry-run   # preview
npx @10565/quicknode-cli@3 generate crud product             # entity, repository, use cases + test, controller, route
npx @10565/quicknode-cli@3 add docker ci                     # recipes: auth, healthcheck, rate-limit, docker, ci...
npx @10565/quicknode-cli@3 upgrade --dry-run                 # what a newer template would change
```

`AGENTS.md` (copied in `CLAUDE.md`) explains the layers and these commands to AI coding assistants.
The generator inserts code before marker comments such as `// qn:modules`: keep them.
`quicknode.json` records how the project was created: commit it.

## 📚 Guide

The [QuickNode guide](https://daksonc.github.io/QuickNode/structure/) explains each folder and layer, and [how to add an entity and a use case](https://daksonc.github.io/QuickNode/tutorial/). From the terminal: `npx @10565/quicknode-cli@3 ui structure`.

## 📄 License

MIT

<!-- quicknode:credits -->
---

Generated with [QuickNode](https://daksonc.github.io/QuickNode/).
<!-- /quicknode:credits -->
