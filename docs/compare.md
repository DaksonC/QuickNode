# QuickNode, Nest CLI or a manual template?

Use QuickNode for a plain Express API with clean architecture and no framework lock-in; use Nest CLI when you want the NestJS framework with its modules, dependency injection and large ecosystem; copy a template by hand when you need full control and will maintain the setup yourself.

## How do they compare?

*Objective criteria, as of v2.x of QuickNode.*

| Criterion | QuickNode CLI | Nest CLI | Manual template |
| --- | --- | --- | --- |
| What you get | Express API, TypeScript or JavaScript | NestJS application | Whatever the template has |
| Architecture | Clean architecture: domain and infrastructure layers | NestJS modules, controllers and providers | Up to you |
| Framework lock-in | Low: domain code is plain TypeScript/JavaScript | High: decorators and the Nest DI container everywhere | Depends on the template |
| CLI dependencies | Zero runtime dependencies | Many (bundles build tooling) | None (git or a download) |
| Code generators after creation | Yes: `qn generate crud` writes every layer, already wired; `qn check` enforces the dependency rule | Yes: `nest generate` for resources, modules, services | No |
| Database ready | PostgreSQL with Docker Compose, TypeORM or Sequelize | No: added through Nest modules | Depends on the template |
| Tests, lint, Git hooks | Jest, ESLint, Prettier, Husky, commitlint | Jest, ESLint, Prettier | Depends on the template |
| Maturity and community | Small, young project, one maintainer | Mature, large community and documentation | n/a |
| Updating later | Manual today (`qn upgrade` planned) | Framework upgrades through npm, with migration guides | Manual |

## When is QuickNode the right choice?

- You want an Express API whose business rules do not depend on the framework or the ORM.
- You care about a small supply chain: one package, no install scripts, provenance on every release.
- You are learning or teaching clean architecture and want a working, tested example to start from.

## When is Nest CLI the better choice?

- Your team already uses NestJS or Angular-style modules and decorators.
- You need official integrations (GraphQL, microservices, queues) and generators for every new resource.
- You value a large community and long-term support over a minimal dependency tree.

## When is a manual template enough?

- Your company already has an internal template with its own conventions.
- You need a stack QuickNode does not offer (Fastify, Prisma, a monorepo) and do not want a framework.
- You are fine updating dependencies and tooling by hand.

Something wrong or outdated here? [Open an issue](https://github.com/DaksonC/QuickNode/issues).

---

Updated on 2026-11-14 · valid for v2.x · https://daksonc.github.io/QuickNode/compare/

> An honest comparison of QuickNode CLI, Nest CLI and copying a template by hand, with objective criteria: dependencies, architecture, framework lock-in and maintenance.
