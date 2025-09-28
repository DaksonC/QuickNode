const express = require('express');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { logger } = require('./infrastructure/logging/logger');
const { setupSwagger } = require('./infrastructure/docs/swagger');
const { errorHandler } = require('./infrastructure/middleware/error-handler');
const { userRoutes } = require('./infrastructure/routes/user-routes');
const sequelizeConnection = require('./infrastructure/database/connection');
const modelsRegistry = require('./infrastructure/database/models');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database connection
async function initializeDatabase() {
  try {
    await sequelizeConnection.initialize();
    modelsRegistry.initialize();
    logger.info('✅ Database connection and models initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize database connection:', error);
    process.exit(1);
  }
}

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

// API routes
app.use('/api/v1/users', userRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await databaseConnection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await databaseConnection.close();
  process.exit(0);
});

// Start the server
async function startServer() {
  try {
    // Initialize database connection
    await sequelizeConnection.initialize();
    modelsRegistry.initialize();
    logger.info('✅ Database connection established');

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
