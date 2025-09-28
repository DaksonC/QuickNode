import { DataSource } from 'typeorm';
import { UserEntity } from './entities/user-entity';

/**
 * Database Connection Manager for TypeScript
 * This class handles database connections in an agnostic way using TypeORM
 */
class DatabaseConnection {
  private dataSource: DataSource | null = null;
  private type: string | null = null;

  /**
   * Initialize database connection based on environment configuration
   */
  async initialize(): Promise<void> {
    const dbType = process.env.DB_TYPE || 'postgresql';
    
    switch (dbType.toLowerCase()) {
      case 'postgresql':
      case 'postgres':
        await this.initializePostgreSQL();
        break;
      case 'mysql':
        await this.initializeMySQL();
        break;
      case 'sqlite':
        await this.initializeSQLite();
        break;
      case 'mongodb':
      case 'mongo':
        throw new Error('MongoDB is not supported with TypeORM. Use native MongoDB driver or Mongoose.');
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  /**
   * Initialize PostgreSQL connection
   */
  private async initializePostgreSQL(): Promise<void> {
    const config: any = {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'quicknode_db',
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      entities: [UserEntity],
      migrations: ['src/infrastructure/database/migrations/*.ts'],
      subscribers: ['src/infrastructure/database/subscribers/*.ts'],
    };

    // Use connection string if provided
    if (process.env.DATABASE_URL) {
      config.url = process.env.DATABASE_URL;
    }

    this.dataSource = new DataSource(config);
    await this.dataSource.initialize();
    this.type = 'postgresql';
    console.log('✅ PostgreSQL connection established successfully');
  }

  /**
   * Initialize MySQL connection
   */
  private async initializeMySQL(): Promise<void> {
    const config: any = {
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'quicknode_db',
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      entities: [UserEntity],
      migrations: ['src/infrastructure/database/migrations/*.ts'],
      subscribers: ['src/infrastructure/database/subscribers/*.ts'],
    };

    this.dataSource = new DataSource(config);
    await this.dataSource.initialize();
    this.type = 'mysql';
    console.log('✅ MySQL connection established successfully');
  }

  /**
   * Initialize SQLite connection
   */
  private async initializeSQLite(): Promise<void> {
    const config: any = {
      type: 'sqlite',
      database: process.env.SQLITE_PATH || './database.sqlite',
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      entities: [UserEntity],
      migrations: ['src/infrastructure/database/migrations/*.ts'],
      subscribers: ['src/infrastructure/database/subscribers/*.ts'],
    };

    this.dataSource = new DataSource(config);
    await this.dataSource.initialize();
    this.type = 'sqlite';
    console.log('✅ SQLite connection established successfully');
  }

  /**
   * Get the current DataSource
   */
  getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  /**
   * Get the database type
   */
  getType(): string {
    return this.type || 'unknown';
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      console.log(`✅ ${this.type} connection closed successfully`);
    }
  }
}

// Singleton instance
export const databaseConnection = new DatabaseConnection();
