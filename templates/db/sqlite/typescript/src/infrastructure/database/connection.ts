import { DatabaseSync } from 'node:sqlite';

/** SQLite connection with node:sqlite, built into Node.js: no driver to install. */
class DatabaseConnection {
  private database: DatabaseSync | null = null;

  async initialize(): Promise<void> {
    this.database = new DatabaseSync(process.env.SQLITE_PATH || './database.sqlite');
  }

  getDatabase(): DatabaseSync {
    if (!this.database) throw new Error('Database not initialized. Call initialize() first.');
    return this.database;
  }

  /** Fails when the database cannot be used (used by readiness checks). */
  async ping(): Promise<void> {
    this.getDatabase().prepare('SELECT 1').get();
  }

  async close(): Promise<void> {
    this.database?.close();
    this.database = null;
  }
}

export const databaseConnection = new DatabaseConnection();
