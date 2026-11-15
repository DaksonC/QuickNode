const { Sequelize } = require('sequelize');

/** PostgreSQL connection through Sequelize, configured from the DB_* variables of .env. */
class DatabaseConnection {
  constructor() {
    this.sequelize = null;
  }

  async initialize() {
    const options = {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: { max: 20, min: 0, acquire: 30000, idle: 10000 },
    };
    // DATABASE_URL, when set, overrides the DB_* variables.
    this.sequelize = process.env.DATABASE_URL
      ? new Sequelize(process.env.DATABASE_URL, options)
      : new Sequelize({
          ...options,
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 5432),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME || 'quicknode_db',
        });
    await this.sequelize.authenticate();
    // Models need the connection; loaded here to avoid a circular require.
    require('./models').initialize();
    // Creates missing tables in development; use migrations in production.
    if (process.env.NODE_ENV === 'development') await this.sequelize.sync();
  }

  getSequelize() {
    if (!this.sequelize) throw new Error('Database not initialized. Call initialize() first.');
    return this.sequelize;
  }

  /** Fails when the database cannot be reached (used by readiness checks). */
  async ping() {
    await this.getSequelize().authenticate();
  }

  async close() {
    if (this.sequelize) await this.sequelize.close();
    this.sequelize = null;
  }
}

const databaseConnection = new DatabaseConnection();
module.exports = { databaseConnection };
