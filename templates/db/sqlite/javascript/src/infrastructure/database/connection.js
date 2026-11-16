const { DatabaseSync } = require('node:sqlite');

/** SQLite connection with node:sqlite, built into Node.js: no driver to install. */
class DatabaseConnection {
  constructor() {
    this.database = null;
  }

  async initialize() {
    this.database = new DatabaseSync(process.env.SQLITE_PATH || './database.sqlite');
  }

  getDatabase() {
    if (!this.database) throw new Error('Database not initialized. Call initialize() first.');
    return this.database;
  }

  /** Fails when the database cannot be used (used by readiness checks). */
  async ping() {
    this.getDatabase().prepare('SELECT 1').get();
  }

  async close() {
    if (this.database) this.database.close();
    this.database = null;
  }
}

const databaseConnection = new DatabaseConnection();
module.exports = { databaseConnection };
