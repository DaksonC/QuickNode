# QuickNode TypeScript API

A complete Node.js TypeScript API template with clean architecture, pre-configured with essential tools and dependencies.

## 🚀 Features

- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **TypeScript**: Full TypeScript support with strict configuration
- **Express.js**: Fast and minimalist web framework
- **Database Support**: Both PostgreSQL (TypeORM) and MongoDB (Mongoose) ready
- **API Documentation**: Swagger/OpenAPI 3.0 with swagger-ui-express
- **Validation**: Request validation with express-validator and class-validator
- **Security**: Helmet for security headers
- **Logging**: Structured logging with Pino
- **Testing**: Jest with TypeScript support and jest-extended
- **Code Quality**: ESLint, Prettier, and pre-commit hooks with Husky
- **Git Hooks**: Conventional commits with commitlint
- **Development**: Hot reload with ts-node-dev

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
│   │   ├── models/        # Mongoose models
│   │   └── repositories/  # Repository implementations
│   ├── docs/             # API documentation setup
│   ├── logging/          # Logging configuration
│   ├── middleware/       # Express middleware
│   └── routes/           # Route definitions
└── server.ts             # Application entry point
```

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`:
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/quicknode_db
MONGO_URL=mongodb://localhost:27017/quicknode_db

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (generate a secure secret for production)
JWT_SECRET=your-super-secure-jwt-secret-key
```

4. Set up git hooks (optional but recommended):
```bash
npm run prepare
```

## 🏃‍♂️ Usage

### Development

Start the development server with hot reload:
```bash
npm run dev
```

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

### PostgreSQL with TypeORM

1. Install PostgreSQL
2. Create database: `quicknode_db`
3. Update `DATABASE_URL` in `.env`
4. Run migrations:
```bash
npm run db:migrate
```

### MongoDB with Mongoose

1. Install MongoDB
2. Update `MONGO_URL` in `.env`
3. The connection will be established automatically

To switch between databases, update the repository imports in your route files.

## 📖 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint TypeScript files
- `npm run lint:fix` - Lint and fix TypeScript files
- `npm run format` - Format code with Prettier
- `npm run db:migrate` - Run TypeORM migrations
- `npm run db:migration:generate` - Generate new migration
- `npm run db:migration:create` - Create empty migration

## 🎯 Usage Examples

### Creating a User

```bash
curl -X POST http://localhost:3000/api/v1/users \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "password123"
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

1. **Create Domain Entity**: Define your business entity in `src/domain/entities/`
2. **Create Repository Interface**: Define repository interface in `src/domain/repositories/`
3. **Create Use Cases**: Define business logic in `src/domain/use-cases/`
4. **Implement Repository**: Create concrete repository in `src/infrastructure/database/repositories/`
5. **Create Controller**: Handle HTTP requests in `src/infrastructure/controllers/`
6. **Define Routes**: Set up routing in `src/infrastructure/routes/`

## 🔒 Security Features

- **Helmet**: Security headers
- **Input Validation**: Request validation with express-validator
- **Environment Variables**: Sensitive data stored in environment variables
- **Error Handling**: Centralized error handling without exposing sensitive information

## 🧪 Testing Strategy

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test the interaction between different parts
- **Test Coverage**: Aim for high test coverage
- **Mocking**: Mock external dependencies

## 📝 Commit Convention

This project uses conventional commits:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example: `feat: add user authentication`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Commit with conventional commit format
6. Create a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with modern Node.js best practices and clean architecture principles.
