# QuickNode CLI

[![NPM version](https://img.shields.io/npm/v/@10565/quicknode-cli.svg)](https://www.npmjs.com/package/@10565/quicknode-cli)
[![npm downloads](https://img.shields.io/npm/dt/@10565/quicknode-cli.svg)](https://www.npmjs.com/package/@10565/quicknode-cli)
[![CI](https://github.com/DaksonC/QuickNode/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DaksonC/QuickNode/actions/workflows/ci.yml)
[![CodeQL](https://github.com/DaksonC/QuickNode/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/DaksonC/QuickNode/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/DaksonC/QuickNode/badge)](https://scorecard.dev/viewer/?uri=github.com/DaksonC/QuickNode)
[![npm provenance](https://img.shields.io/badge/npm-provenance-blue?logo=npm)](https://www.npmjs.com/package/@10565/quicknode-cli#provenance)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@10565/quicknode-cli?activeTab=dependencies)
[![GitHub stars](https://img.shields.io/github/stars/DaksonC/QuickNode.svg?style=social&label=Star)](https://github.com/DaksonC/QuickNode)

**Zero-dependency CLI to create Node.js APIs with clean architecture.**

```bash
npx @10565/quicknode-cli create my-api
```

📚 **Documentation:** [daksonc.github.io/QuickNode](https://daksonc.github.io/QuickNode/) ([português](https://daksonc.github.io/QuickNode/pt/)) — getting started, command reference, project structure, a tutorial and an honest comparison with Nest CLI.

> Not to be confused with QuickNode, the blockchain infrastructure provider: this is an open source scaffolding tool, always installed by its scoped name `@10565/quicknode-cli`.

## ✨ Features

- **TypeScript & JavaScript Support**: Choose between TypeScript or JavaScript templates
- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **Generators**: `qn generate crud product` writes entity, repository, use cases, test, controller and route, already wired
- **Dependency rule check**: `qn check` fails (exit code 1) when the domain imports infrastructure, Express or an ORM
- **Recipes**: `qn add auth|healthcheck|rate-limit|graceful-shutdown|docker|ci|agents|...`, idempotent, with `--dry-run` diffs
- **Ready for AI agents**: `AGENTS.md`/`CLAUDE.md` in every project; every command works without prompts and with `--json`
- **Pre-configured Dependencies**: All essential tools ready to use
- **SQL Databases**: PostgreSQL by default (via Docker), plus MySQL and SQLite — TypeORM (TypeScript) or Sequelize (JavaScript)
- **API Documentation**: Swagger/OpenAPI 3.0 integration
- **Security & Validation**: Helmet, express-validator, and class-validator
- **Testing Setup**: Jest with extended matchers and coverage
- **Code Quality**: ESLint 10 (flat config), Prettier, Husky 9 hooks and commitlint
- **Development Tools**: Hot reload with tsx (TypeScript) / `node --watch` (JavaScript)
- **Zero runtime dependencies**: the CLI itself is a single package built only on Node.js APIs
- **Logging**: Structured logging with Pino

## 📦 Installation

Requires **Node.js 22.13 or newer**.

Install the CLI globally:

```bash
npm install -g @10565/quicknode-cli
```

Alternatively, you can run it without a global installation using `npx`:

```bash
npx @10565/quicknode-cli create my-awesome-app
```

## 🎯 Usage

### Create a new project

If you have installed the CLI globally, you can use the `qn` command directly.

```bash
# Create a new project in a new directory
qn create my-awesome-app

# Create a project in the current directory
qn create .

# Interactive mode (will prompt for options)
qn create
```

### Command Options

```bash
# Use TypeScript template (without a flag, the CLI asks)
qn create my-app --typescript

# Use JavaScript template
qn create my-app --javascript

# Write into a non-empty directory, overwriting conflicting files
qn create . --force

# Initialize git and install dependencies right away
qn create my-app -ts --git --install

# Preview the files without writing anything
qn create my-app --dry-run
```

| Option | Description |
| --- | --- |
| `-t`, `--typescript` (`-ts`) | Use the TypeScript template |
| `-j`, `--javascript` (`-js`) | Use the JavaScript template |
| `-f`, `--force` | Write into a non-empty directory, overwriting conflicting files |
| `-y`, `--yes` | Accept defaults without prompting (name `my-quicknode-app`, TypeScript) |
| `--dry-run` | Show what would be created without writing anything |
| `--install` | Run `npm install` after creating the project |
| `--git` | Initialize a git repository (enables the Husky hooks on install) |
| `--no-credits` | Leave the "Generated with QuickNode" line out of the generated README |
| `--pm <npm\|pnpm\|yarn>` | Package manager used in scripts, docs, hooks and `--install` (default: npm) |
| `--test <jest\|node>` | Test runner (default: Jest; `node` uses the built-in `node:test`) |
| `--json` | Print a JSON result (or error) to stdout; no prompts or colors |

Run `qn help create` (or `qn create --help`) for the full reference.

### Grow the project

Inside a generated project:

```bash
qn generate crud product --dry-run   # preview the files and the wiring
qn g crud product                    # entity, repository, use cases + test, controller, route, module
qn g crud order-item --only entity,repository
qn g usecase product --no-test       # one part: entity, repository, usecase or controller

qn check                             # dependency rule; exit code 1 on violations (CI, git hooks)
qn check --json

qn add docker ci                     # recipes: agents, auth, ci (github-actions), docker, eslint,
qn add auth --dry-run                #   graceful-shutdown, healthcheck, husky, rate-limit, swagger, tests

qn doctor                            # Node.js, .env, Docker, npm audit and qn check (--offline skips the audit)
```

Generators and recipes insert code before marker comments of the template (`// qn:modules`,
`// qn:entities`...), never overwrite a changed file without `--force`, and running them twice
changes nothing.

### Open the documentation

```bash
qn ui                    # documentation home
qn docs create           # alias; opens the reference of qn create
qn ui structure --lang pt
qn ui faq --print        # only print the link
```

Topics: `start`, `commands`, `create`, `ui`, `generate`, `check`, `add`, `doctor`, `structure`,
`tutorial`, `faq`, `compare`, `changelog`, `adr`. The link is always printed; a browser is opened only in an interactive
desktop session (never in CI, over SSH or in a container), with the system opener and no shell.

### Scripts and CI

`qn` never prompts when stdin is not a terminal: pass the name and template (or `--yes`).
Prompts and progress go to stderr and results to stdout, so `--json` output can be piped.
Exit codes: `0` success, `1` error, `2` invalid usage.

```bash
qn create api --yes --json | jq .targetDir
```

### Safety

- **Never overwrites silently.** If the target directory is not empty (a `.git` folder is
  ignored), `qn create` stops and lists the files that would be overwritten. Use `--force`
  to write anyway; files that are not part of the template are kept, and an existing `.env`
  is never replaced.
- **Validated names.** The project name must be a valid npm package name (lowercase, no
  path separators or `..`), so the project is always created inside the current directory.
- **No half-written projects.** The project is generated in a temporary folder and moved into
  place only when everything succeeded.
- **No default secrets.** A git-ignored `.env` is generated with a random `DB_PASSWORD` and
  `JWT_SECRET`; `docker-compose.yml` reads them from there and only listens on `127.0.0.1`.

### Verifying releases

Every version is published by GitHub Actions from a tag on `main` using npm Trusted
Publishing, with a signed [provenance](https://docs.npmjs.com/generating-provenance-statements)
attestation linking the tarball to its commit and build. Each GitHub Release also ships a
CycloneDX SBOM.

```bash
npm audit signatures   # in a project that installed the CLI
npm view @10565/quicknode-cli@latest dist.attestations --json
```

Found a vulnerability? Please report it privately — see [SECURITY.md](SECURITY.md).

## 🏗️ What's Included

### Dependencies

- **Express.js**: Web framework
- **Helmet**: Security middleware
- **Express-validator**: Request validation
- **Pino**: Structured logging
- **Swagger**: API documentation
- **TypeORM**: SQL ORM (TypeScript template)
- **Sequelize**: SQL ORM (JavaScript template)
- **Class-transformer & Class-validator**: DTO validation (TypeScript)

### Development Dependencies

- **TypeScript**: Type checking (TypeScript template)
- **tsx**: Development server with hot reload (TypeScript)
- **Jest**: Testing framework
- **Jest-extended**: Additional Jest matchers
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Commitlint**: Conventional commits

### Pre-configured Scripts

```json
{
  "dev": "Start development server",
  "build": "Build TypeScript to JavaScript (TypeScript only)",
  "start": "Start production server",
  "test": "Run tests",
  "test:watch": "Run tests in watch mode",
  "test:coverage": "Run tests with coverage",
  "lint": "Lint code",
  "lint:fix": "Lint and fix code",
  "format": "Format code with Prettier"
}
```

## 🏛️ Clean Architecture Structure

```
src/
├── domain/                 # Domain layer (business logic)
│   ├── entities/          # Domain entities
│   ├── repositories/      # Repository interfaces
│   └── use-cases/         # Application use cases
├── infrastructure/        # Infrastructure layer
│   ├── controllers/       # HTTP controllers
│   ├── database/          # Database configuration
│   │   ├── entities/      # TypeORM entities (TypeScript)
│   │   ├── models/        # Sequelize models (JavaScript)
│   │   └── repositories/  # Repository implementations
│   ├── docs/             # API documentation setup
│   ├── logging/          # Logging configuration
│   ├── middleware/       # Express middleware
│   └── routes/           # Route definitions
└── server.ts/js          # Application entry point
```

## 🚀 Quick Start

After creating your project:

1. **Navigate to your project**:
   ```bash
   cd my-awesome-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Review `.env`**: it was generated with random secrets and is git-ignored. Adjust
   `DB_TYPE`, `PORT` and other settings if needed (see `.env.example`).

4. **Start the database** (PostgreSQL via Docker):
   ```bash
   npm run docker:up
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Visit your API**:
   - API: http://localhost:3000
   - Documentation: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/health

## 📊 Database Setup

### PostgreSQL (default)

1. Start the database: `npm run docker:up` (credentials come from `.env`)
2. Seed sample data (optional): `npm run db:seed`
3. Tables are synchronized automatically when `NODE_ENV=development`

### MySQL / SQLite

Set `DB_TYPE=mysql` or `DB_TYPE=sqlite` in `.env` and adjust the `DB_*` variables. The JavaScript
template needs only the driver (`npm install mysql2` or `sqlite3`); in the TypeScript template
these repositories are not implemented yet.

## 🧪 Testing

The template includes a complete testing setup:

- **Unit tests** for use cases and entities
- **Integration tests** for API endpoints
- **Coverage reports** with detailed metrics
- **Jest extended** for additional matchers

Run tests:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

## 🔧 Code Quality

### ESLint & Prettier

Code quality is ensured with ESLint and Prettier:

```bash
npm run lint          # Check for issues
npm run lint:fix      # Fix issues automatically
npm run format        # Format code
```

### Git Hooks

Husky 9 installs the hooks on `npm install` when the project is a git repository
(`qn create --git` does `git init` for you). They:
- Lint the code before each commit
- Validate commit messages (conventional commits)

### Conventional Commits

Commit format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat: add user authentication`
- `fix: resolve database connection issue`
- `docs: update API documentation`

## 🌟 Example API

The template includes a complete User API with:

- Create user (POST /api/v1/users)
- Get all users (GET /api/v1/users)
- Get user by ID (GET /api/v1/users/:id)
- Update user (PUT /api/v1/users/:id)
- Delete user (DELETE /api/v1/users/:id)

All endpoints include:
- Input validation
- Error handling
- Swagger documentation
- Clean architecture implementation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Run the checks: `npm run verify` (lint, tests with coverage, audits) and, when you touch a template,
   `QN_E2E_TEMPLATES=all npm run test:templates` (generates both templates and runs install,
   audit, lint, test and build — needs network). Documentation changes: edit `docs-src/`, run
   `npm run docs:build` and commit `docs/` (see [docs-src/README.md](docs-src/README.md))
4. Commit changes: `git commit -m 'feat: add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⬆️ Migrating from v1 to v2

- **Node.js 22.13+** is required, for both the CLI and the generated projects.
- `-ts` / `-js` still work; the new short forms are `-t` / `-j`.
- Without a terminal (CI, pipes), `qn create` no longer waits for prompts: pass the
  project name and `--typescript`/`--javascript`, or use `--yes`.
- `qn create` refuses non-empty directories unless `--force` (since v1.2).
- Generated projects load `.env` with `process.loadEnvFile()` (no `dotenv`), use
  `node --watch` instead of nodemon (JavaScript), ESLint 10 flat config and Husky 9.
- The banner and donation link are shown only in `qn --help`.

## 🙏 Acknowledgments

- Built with modern Node.js best practices
- Inspired by clean architecture principles
- Designed for developer productivity

## 📞 Support

If you have any questions or issues:

1. Check the [GitHub Issues](https://github.com/DaksonC/QuickNode/issues)
2. Create a new issue if needed
3. Contribute to make it better!

### ☕ Buy us a Coffee

- **PayPal**: [Dakson Chaves Cruz](https://www.paypal.com/donate/?hosted_button_id=EA36NAFVH6LDY)
---

**Happy coding! 🎉**
