# QuickNode CLI

🚀 A powerful CLI tool to quickly bootstrap Node.js projects with clean architecture and pre-configured dependencies.

## ✨ Features

- **TypeScript & JavaScript Support**: Choose between TypeScript or JavaScript templates
- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **Pre-configured Dependencies**: All essential tools ready to use
- **Multiple Database Support**: PostgreSQL (TypeORM) and MongoDB (Mongoose)
- **API Documentation**: Swagger/OpenAPI 3.0 integration
- **Security & Validation**: Helmet, express-validator, and class-validator
- **Testing Setup**: Jest with extended matchers and coverage
- **Code Quality**: ESLint, Prettier, and Husky pre-commit hooks
- **Development Tools**: Hot reload with ts-node-dev/nodemon
- **Logging**: Structured logging with Pino

## 📦 Installation

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
# Use TypeScript template (default)
qn create my-app --typescript

# Use JavaScript template
qn create my-app --javascript
```

## 🏗️ What's Included

### Dependencies

- **Express.js**: Web framework
- **Helmet**: Security middleware
- **Dotenv**: Environment variable management
- **Express-validator**: Request validation
- **Pino**: Structured logging
- **Swagger**: API documentation
- **TypeORM**: PostgreSQL ORM (TypeScript template)
- **Mongoose**: MongoDB ODM
- **Class-transformer & Class-validator**: DTO validation (TypeScript)

### Development Dependencies

- **TypeScript**: Type checking (TypeScript template)
- **ts-node-dev**: Development server with hot reload (TypeScript)
- **Nodemon**: Development server with hot reload (JavaScript)
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
│   │   ├── models/        # Mongoose models
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

3. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Update environment variables** in `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/your_db
   MONGO_URL=mongodb://localhost:27017/your_db
   PORT=3000
   JWT_SECRET=your-secret-key
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

### PostgreSQL (TypeScript template)

1. Install PostgreSQL
2. Create a database
3. Update `DATABASE_URL` in `.env`
4. Run migrations: `npm run db:migrate` (TypeScript only)

### MongoDB

1. Install MongoDB
2. Update `MONGO_URL` in `.env`
3. Connection is automatic

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

Pre-commit hooks automatically:
- Lint and fix code
- Format code
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
3. Commit changes: `git commit -m '''feat: add amazing feature'''`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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
