# QuickNode JavaScript API

A complete Node.js JavaScript API template with clean architecture and essential tools pre-configured.

## 🚀 Features

- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **Express.js**: Fast and minimalist web framework
- **Database Support**: Both PostgreSQL and MongoDB ready
- **API Documentation**: Swagger/OpenAPI 3.0 with swagger-ui-express
- **Validation**: Request validation with express-validator
- **Security**: Helmet for security headers
- **Logging**: Structured logging with Pino
- **Testing**: Jest with jest-extended
- **Code Quality**: ESLint and Prettier
- **Git Hooks**: Conventional commits with commitlint
- **Development**: Hot reload with nodemon

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`

4. Set up git hooks:
```bash
npm run prepare
```

## 🏃‍♂️ Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Formatting
```bash
npm run format
```

## 📖 API Documentation

Visit http://localhost:3000/api-docs for Swagger documentation.

## 📁 Project Structure

```
src/
├── domain/                 # Domain layer (business logic)
│   ├── entities/          # Domain entities
│   ├── repositories/      # Repository interfaces
│   └── use-cases/         # Application use cases
├── infrastructure/        # Infrastructure layer
│   ├── controllers/       # HTTP controllers
│   ├── database/          # Database configuration
│   ├── docs/             # API documentation setup
│   ├── logging/          # Logging configuration
│   ├── middleware/       # Express middleware
│   └── routes/           # Route definitions
└── server.js             # Application entry point
```

## 📄 License

MIT License
