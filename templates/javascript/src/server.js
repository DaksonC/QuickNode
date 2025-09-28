const express = require('express');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { logger } = require('./infrastructure/logging/logger');
const { setupSwagger } = require('./infrastructure/docs/swagger');
const { errorHandler } = require('./infrastructure/middleware/error-handler');
const { createUserRoutes } = require('./infrastructure/routes/user-routes');
const sequelizeConnection = require('./infrastructure/database/connection');
const modelsRegistry = require('./infrastructure/database/models');
const { RepositoryFactory } = require('./infrastructure/database/repository-factory');
const { UserController } = require('./infrastructure/controllers/user-controller');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Swagger documentation
setupSwagger(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start the server
async function startServer() {
  try {
    // Initialize database connection and models
    await sequelizeConnection.initialize();
    modelsRegistry.initialize();
    logger.info('✅ Database connection established and models initialized');

    // --- Dependency Injection Setup ---
    const userRepository = RepositoryFactory.createUserRepository();
    const userController = new UserController(userRepository);
    const userRoutes = createUserRoutes(userController);

    // API routes
    app.use('/api/v1/users', userRoutes);
    // --- End of DI Setup ---

    // Error handling middleware (should be last)
    app.use(errorHandler);

    // 404 handler
    app.use('* ', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down gracefully...');
  await sequelizeConnection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down gracefully...');
  await sequelizeConnection.close();
  process.exit(0);
});

// Start the server
startServer();

// Export the app for testing
module.exports = app;