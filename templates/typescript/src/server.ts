import 'reflect-metadata';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './infrastructure/logging/logger';
import { setupSwagger } from './infrastructure/docs/swagger';
import { errorHandler } from './infrastructure/middleware/error-handler';
import { userRoutes } from './infrastructure/routes/user-routes';
import { databaseConnection } from './infrastructure/database/connection';

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
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/users', userRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await databaseConnection.initialize();
    logger.info('🔌 Database connection initialized successfully');

    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🔄 SIGTERM received, shutting down gracefully');
  await databaseConnection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🔄 SIGINT received, shutting down gracefully');
  await databaseConnection.close();
  process.exit(0);
});

// Start the server
startServer();
