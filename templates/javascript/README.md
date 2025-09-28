# QuickNode JavaScript API

A complete Node.js JavaScript API template with clean architecture and essential tools pre-configured.

## 🚀 Features

- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **Express.js**: Fast and minimalist web framework
- **Database Support**: PostgreSQL with Sequelize ORM (MySQL, SQLite also supported)
- **Repository Pattern**: Clean abstraction layer for data access
- **Use Cases**: Business logic encapsulated in use cases
- **Dependency Injection**: Flexible repository factory pattern
- **API Documentation**: Swagger/OpenAPI 3.0 with swagger-ui-express
- **Validation**: Request validation with express-validator
- **Security**: Helmet for security headers
- **Logging**: Structured logging with Pino
- **Testing**: Jest with jest-extended
- **Code Quality**: ESLint and Prettier
- **Git Hooks**: Conventional commits with commitlint
- **Development**: Hot reload with nodemon
- **ORM**: Sequelize for database operations and migrations

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
│   │   ├── models/        # Sequelize models
│   │   └── repositories/  # Repository implementations
│   ├── docs/             # API documentation setup
│   ├── logging/          # Logging configuration
│   ├── middleware/       # Express middleware
│   └── routes/           # Route definitions
└── server.js             # Application entry point
```

## 🛠️ Installation

### Manual Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`:
   - Set `DB_TYPE` to your preferred database (postgresql, mysql, sqlite)
   - Configure database connection settings
   - Update other environment variables as needed

4. Set up Git hooks (optional, but recommended for contributors):
```bash
# First, initialize your git repository
git init

# Then, install Husky hooks
npx husky install
```

5. Start development server:
```bash
npm run dev
```

## 🐳 Docker Commands

```bash
# Start PostgreSQL container
npm run docker:up

# Stop PostgreSQL container  
npm run docker:down

# View PostgreSQL logs
npm run docker:logs

# Reset database (removes all data)
npm run docker:reset

# Start development with Docker
npm run dev:docker
```

## 🗄️ Database Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database Configuration (Sequelize ORM)
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=quicknode_db

# For alternative databases:
# DB_TYPE=mysql    # MySQL support
# DB_TYPE=sqlite   # SQLite support

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Database Support

The template supports multiple databases through Sequelize ORM:

**PostgreSQL (Default - Recommended)**
- Set `DB_TYPE=postgresql` 
- Uses Docker container by default
- Includes Adminer for database management

**MySQL**
- Set `DB_TYPE=mysql`
- Configure MySQL connection in `.env`

**SQLite**
- Set `DB_TYPE=sqlite`
- No additional setup required

### Database Operations

```bash
# Seed database with sample data
npm run db:seed

# Setup database (Docker + Seed)
npm run db:setup

# Reset database completely
npm run docker:reset
```

## 🏃‍♂️ Usage

### Development

Start the development server with hot reload:
```bash
npm run dev
```

### Production

Start production server:
```bash
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

## 📖 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint JavaScript files
- `npm run lint:fix` - Lint and fix JavaScript files
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start PostgreSQL container
- `npm run docker:down` - Stop PostgreSQL container
- `npm run docker:logs` - View PostgreSQL logs
- `npm run docker:reset` - Reset database (removes all data)
- `npm run db:seed` - Seed database with sample data
- `npm run db:setup` - Setup database (Docker + Seed)
- `npm run dev:docker` - Start development with Docker

## 🎯 Usage Examples

### Creating a User

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30
  }'
```

### Getting All Users

```bash
curl http://localhost:3000/users
```

### Getting a User by ID

```bash
curl http://localhost:3000/users/YOUR_USER_ID
```

## 🏗️ Architecture

This template follows Clean Architecture principles:

- **Domain Layer**: Contains business entities, repository interfaces, and use cases
- **Infrastructure Layer**: Contains framework-specific code, database implementations, and external service integrations
- **Dependency Inversion**: High-level modules don't depend on low-level modules; both depend on abstractions

## 📄 License

MIT License
