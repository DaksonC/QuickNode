import './infrastructure/config/load-env';
import 'reflect-metadata';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { logger } from './infrastructure/logging/logger';
import { setupSwagger } from './infrastructure/docs/swagger';
import { errorHandler } from './infrastructure/middleware/error-handler';
import { databaseConnection } from './infrastructure/database/connection';
import { registerUserModule } from './infrastructure/modules/user-module';
// qn:imports

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// qn:middleware

// Setup Swagger documentation
setupSwagger(app);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await databaseConnection.initialize();
    logger.info('🔌 Database connection initialized successfully');

    // Feature modules (`qn generate crud <name>` adds new ones here)
    await registerUserModule(app);
    // qn:modules

    // 404 handler for unknown routes
    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Error handling middleware (should be last)
    app.use(errorHandler);

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });

    // qn:shutdown:start
    // Basic shutdown; `qn add graceful-shutdown` replaces this block.
    const shutdown = (signal: string) => {
      logger.info(`🔄 ${signal} received, shutting down`);
      server.close(() => {
        void databaseConnection.close().finally(() => process.exit(0));
      });
    };
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
    // qn:shutdown:end
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();

// Export the app for testing
export default app;
