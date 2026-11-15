# Project structure

A QuickNode project splits `src/` into two layers: `domain` holds the business rules (entities, repository interfaces, use cases) and `infrastructure` holds everything that talks to the outside world (HTTP, database, logs, docs).

## What is in each folder?

```
src/
├── domain/                  business rules, no Express or ORM
│   ├── entities/            User and its input types
│   ├── repositories/        UserRepository interface
│   └── use-cases/           CreateUser, GetUser, UpdateUser...
├── infrastructure/          adapters to the outside world
│   ├── config/              load-env: reads .env with Node's loader
│   ├── controllers/         HTTP in, use case call, HTTP out
│   ├── database/
│   │   ├── connection.ts    TypeORM data source
│   │   ├── entities/        TypeORM table mappings
│   │   ├── repositories/    UserRepository implementation
│   │   └── repository-factory.ts
│   ├── docs/                Swagger (OpenAPI 3) setup
│   ├── http/dtos/           request DTOs validated with class-validator
│   ├── logging/             pino logger
│   ├── middleware/          validation and error handler
│   ├── modules/             wiring of each feature: repository → use cases → controller → routes
│   └── routes/              Express routers
├── __tests__/               tests of the use cases, with in-memory repositories
└── server.ts                Express app: middleware, feature modules, startup and shutdown
```

The JavaScript template has the same layers, with Sequelize models in `infrastructure/database/models/` instead of TypeORM entities.

## What is the dependency rule?

Dependencies point inwards: `infrastructure` may import `domain`, but `domain` imports only other domain files and Node.js built-in modules: never `infrastructure`, Express, the ORM or another package. A use case receives a repository *interface* in its constructor; the feature module in `infrastructure/modules` decides which implementation it gets.

```
HTTP request
  → routes/        (Express router, request validation)
  → controllers/   (turns HTTP into a call)
  → use-cases/     (business rule)          ← domain
  → repositories/  (interface)              ← domain
  ← database/repositories/ (TypeORM implementation)
```

Keeping this rule is what lets you test use cases without a database and replace Express or the ORM later. `qn check` enforces it: it lists every import that breaks the rule, with file and line, and exits with code 1, for CI and git hooks. `qn generate` writes new features already on the right side of it.

## What does each layer do?

- **domain/entities**: Plain classes with the data and behavior of the business (`User.updateName()`). Input validation lives in infrastructure: class-validator DTOs in `http/dtos` (TypeScript) or express-validator rules in the routes (JavaScript).
- **domain/repositories**: Interfaces that say what the domain needs from storage (`findByEmail`, `create`…), never how.
- **domain/use-cases**: One class per action, with an `execute()` method. Rules such as "the email must be unique" live here.
- **infrastructure/database**: The connection, the ORM mappings and the classes that implement the repository interfaces, converting rows into domain entities.
- **infrastructure/controllers and routes**: Translate HTTP into use case calls and results into JSON responses, with status codes and Swagger annotations.
- **infrastructure/modules**: The composition root of each feature: creates the repository, injects it into the use cases, the use cases into the controller, and mounts the routes under `/api/v1`.
- **server.ts**: Creates the Express app, registers the middleware and every feature module, starts the server and shuts it down.

Comments such as `// qn:modules` and `// qn:entities` mark where `qn generate` and `qn add` insert code. Keep them; if one is removed, the commands print the lines to add by hand.

## Which files sit at the project root?

- `.env`: generated with random `DB_PASSWORD` and `JWT_SECRET`, git-ignored, permission 600. `.env.example` documents every variable.
- `docker-compose.yml`: PostgreSQL 17 and Adminer, both bound to 127.0.0.1.
- `eslint.config.mjs`, `.prettierrc.json`, `jest.config.js`, `commitlint.config.js` and `.husky/`: quality tools.
- `AGENTS.md` and its copy `CLAUDE.md`: the layers, the dependency rule and the commands to run, for AI coding assistants.

Scripts: `npm run dev`, `npm test`, `npm run lint`, `npm run check` (`qn check`), `npm run docker:up`, `npm run db:seed`; the TypeScript template adds `npm run build`.

Next: [add a new entity and use case](https://daksonc.github.io/QuickNode/tutorial/).

---

Updated on 2026-11-14 · valid for v2.x · https://daksonc.github.io/QuickNode/structure/

> What each folder of a QuickNode project does: domain entities, repository interfaces and use cases, and the infrastructure layer with Express, TypeORM or Sequelize.
