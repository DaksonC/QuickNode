import { DataSource } from 'typeorm';
import { UserEntity } from './entities/user-entity';
// qn:imports

/** TypeORM entities of every feature (`qn generate` adds new ones here). */
const entities = [
  UserEntity,
  // qn:entities
];

/** PostgreSQL connection through TypeORM, configured from the DB_* variables of .env. */
class DatabaseConnection {
  private dataSource: DataSource | null = null;

  async initialize(): Promise<void> {
    const dataSource = new DataSource({
      type: 'postgres',
      // DATABASE_URL, when set, overrides the DB_* variables.
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'quicknode_db',
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      entities,
    });
    await dataSource.initialize();
    this.dataSource = dataSource;
  }

  getDataSource(): DataSource {
    if (!this.dataSource) throw new Error('Database not initialized. Call initialize() first.');
    return this.dataSource;
  }

  /** Fails when the database cannot be reached (used by readiness checks). */
  async ping(): Promise<void> {
    await this.getDataSource().query('SELECT 1');
  }

  async close(): Promise<void> {
    if (this.dataSource?.isInitialized) await this.dataSource.destroy();
    this.dataSource = null;
  }
}

export const databaseConnection = new DatabaseConnection();
