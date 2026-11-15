# QuickNode TypeScript API

A complete Node.js TypeScript API template with clean architecture, pre-configured with essential tools and dependencies.

## 🚀 Features

- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **TypeScript**: Full TypeScript support with strict configuration
- **Express.js**: Fast and minimalist web framework
- **Database Support**: PostgreSQL (default, via Docker), MySQL and SQLite with TypeORM
- **API Documentation**: Swagger/OpenAPI 3.0 with swagger-ui-express
- **Validation**: Request validation with express-validator and class-validator
- **Security**: Helmet for security headers
- **Logging**: Structured logging with Pino
- **Testing**: Jest with TypeScript support and jest-extended
- **Code Quality**: ESLint 10 (flat config), Prettier and Husky git hooks
- **Git Hooks**: Conventional commits with commitlint
- **Development**: Hot reload with tsx

## 📁 Project Structure

```
src/
├── domain/                 # Domain layer (business logic)
│   ├── entities/          # Domain entities
│   ├── repositories/      # Repository interfaces
│   └── use-cases/         # Application use cases
├── infrastructure/        # Infrastructure layer
│   ├── controllers/       # HTTP controllers
│   ├── database/          # Database configuration and implementations
│   │   ├── entities/      # TypeORM entities
│   │   └── repositories/  # Repository implementations
│   ├── docs/             # API documentation setup
│   ├── http/dtos/        # Request DTOs (class-validator)
│   ├── logging/          # Logging configuration
│   ├── middleware/       # Express middleware
│   ├── modules/          # Wiring of each feature (repository -> use cases -> controller -> routes)
│   └── routes/           # Route definitions
└── server.ts             # Application entry point
```

## 📋 Requirements

- Node.js 22.13 or newer (`.env` is loaded with the native `process.loadEnvFile()`, no dotenv)
- Docker, for the PostgreSQL container

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Review the environment variables in `.env`:

`qn create` already generated a `.env` (git-ignored) from `.env.example`, with a random
`DB_PASSWORD` and `JWT_SECRET`. Never commit it. If you cloned the project instead,
create it yourself and replace every `change-me` value:
```bash
cp .env.example .env
```

3. Adjust the remaining settings as needed (`DB_TYPE`, `PORT`, `LOG_LEVEL`...).

4. Git hooks (Husky 9) are installed by `npm install` once the folder is a git
repository (`qn create --git` already did `git init` for you). Otherwise:
```bash
git init
npm run prepare
```
They lint the code before each commit and check commit messages (conventional commits).

## 🏃‍♂️ Usage

### Development

Start the development server with hot reload:
```bash
npm run dev
```

For development with a database, use the Dockerized setup:
```bash
npm run dev:docker
```
This will start the required services (like PostgreSQL) and then run the development server.

### Production

Build and start:
```bash
npm run build
npm start
```

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

### Linting and Formatting

Lint code:
```bash
npm run lint
```

Fix lint issues:
```bash
npm run lint:fix
```

Format code:
```bash
npm run format
```

## 📊 Database Setup

This template is configured to use Docker for database management, simplifying setup.

1.  **Start Database Container**:
    ```bash
    npm run docker:up
    ```
    This command starts a PostgreSQL container in the background.

2.  **Seed Database**:
    To populate the database with initial data, run:
    ```bash
    npm run db:seed
    ```

3.  **Combined Setup**:
    To start the database and seed it in one command, run:
    ```bash
    npm run db:setup
    ```

To stop the database container, run `npm run docker:down`.

## 📖 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 🎯 Usage Examples

### Creating a User

```bash
curl -X POST http://localhost:3000/api/v1/users \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "name": "John Doe"
  }'
```

### Getting All Users

```bash
curl http://localhost:3000/api/v1/users
```

### Getting User by ID

```bash
curl http://localhost:3000/api/v1/users/1
```

## 🏗️ Clean Architecture

This project follows Clean Architecture principles:

1. **Domain Layer**: Contains business entities, repository interfaces, and use cases
2. **Infrastructure Layer**: Contains external concerns like databases, web frameworks, and external services

### Adding New Features

Generate a feature with every layer already wired, then add its fields:

```bash
npx @10565/quicknode-cli@2 generate crud product --dry-run   # preview
npx @10565/quicknode-cli@2 generate crud product             # entity, repository, use cases + test, controller, route
npx @10565/quicknode-cli@2 add docker ci                     # recipes: auth, healthcheck, rate-limit, docker, ci...
npm run check                                              # dependency rule (qn check)
```

`AGENTS.md` (copied in `CLAUDE.md`) explains the layers and these commands to AI coding assistants.
The generator inserts code before marker comments such as `// qn:modules`: keep them.

## 🔒 Security Features

- **Helmet**: Security headers
- **Input Validation**: Request validation with express-validator
- **Environment Variables**: Sensitive data stored in environment variables
- **Error Handling**: Centralized error handling without exposing sensitive information

## 📄 License

This project is licensed under the MIT License.

## 📚 Guide

The [QuickNode guide](https://daksonc.github.io/QuickNode/structure/) explains each folder and layer, and [how to add an entity and a use case](https://daksonc.github.io/QuickNode/tutorial/). From the terminal: `npx @10565/quicknode-cli ui structure`.

<!-- quicknode:credits -->
---

Generated with [QuickNode](https://daksonc.github.io/QuickNode/).
<!-- /quicknode:credits -->
