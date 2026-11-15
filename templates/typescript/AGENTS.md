# AGENTS.md

Instructions for AI coding assistants (and people) working on this project. `CLAUDE.md` is a
copy of this file: keep both equal.

This is a Node.js TypeScript API with clean architecture, created with
[QuickNode](https://daksonc.github.io/QuickNode/): Express, TypeORM, PostgreSQL.

## Layers

```
src/
  domain/                  business rules: no frameworks, no database, no HTTP
    entities/              entities and their data types
    repositories/          repository interfaces (contracts)
    use-cases/             one class per use case
  infrastructure/          everything that talks to the outside world
    controllers/           HTTP handlers: call use cases, map errors to status codes
    routes/                Express routers (with OpenAPI comments)
    http/dtos/           request DTOs validated with class-validator
    database/              TypeORM connection, repository implementations, factory
      database/entities/   TypeORM entities (persistence model)
    modules/               wiring of each feature: repository -> use cases -> controller -> routes
  server.ts                Express app: middleware, modules, startup and shutdown
  __tests__/               tests (use cases are tested with in-memory repositories)
```

## Dependency rule

Dependencies point inward. Code in `src/domain` may import only other files in `src/domain` and
Node.js built-in modules (`node:*`). It must not import `src/infrastructure`, Express, TypeORM,
database drivers or any other package. Infrastructure implements the domain interfaces and
depends on the domain, never the other way around.

Check it with `npm run check`, which runs `qn check` (install the CLI once with
`npm i -g @10565/quicknode-cli`, or run `npx @10565/quicknode-cli check`). It exits with a non-zero code and lists each
violation with file and line. Fix violations by moving the code to infrastructure and depending
on an interface from the domain.

## Adding features

Prefer the generator over writing the structure by hand: it creates every layer, already wired.

```bash
npx @10565/quicknode-cli generate crud product --dry-run   # see what would change
npx @10565/quicknode-cli generate crud product             # entity, repository, use cases, controller, route, test
npx @10565/quicknode-cli g usecase product --no-test       # a single part: entity, repository, usecase, controller
```

Generated code is a starting point: add the fields of the entity to the domain entity, the
persistence model and the validation (DTOs with class-validator in `src/infrastructure/http/dtos/`).

Tools are added with `npx @10565/quicknode-cli add <recipe>` (for example `docker`, `auth`,
`healthcheck`, `rate-limit`, `ci`); `--dry-run` shows the diff first.

The generator and the recipes insert code before marker comments such as `// qn:imports`,
`// qn:modules` and `// qn:entities`. Keep those comments in place.

## After each change

- Tests: `npm test`
- Lint: `npm run lint` (`npm run lint:fix` fixes formatting)
- Dependency rule: `npm run check`
- Build: `npm run build` (TypeScript must compile).

All of them must pass before a commit. The pre-commit hook runs the lint.

## Conventions

- Commit messages follow Conventional Commits (`feat: ...`, `fix: ...`), checked by commitlint.
- Configuration comes from environment variables (`.env`, git-ignored; `.env.example` documents
  them). Never commit `.env` or put secrets in code.
- Use cases throw domain errors; controllers map them to HTTP status codes.
