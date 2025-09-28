const { Sequelize } = require('sequelize');

/**
 * Sequelize Database Connection Manager
 * This class handles database connections using Sequelize ORM
 */
class SequelizeConnection {
  constructor() {
    this.sequelize = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection based on environment configuration
   */
  async initialize() {
    const dbType = process.env.DB_TYPE || 'postgresql';
    
    try {
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
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }

      // Test the connection
      await this.sequelize.authenticate();
      console.log(`Connected to ${dbType} database successfully`);
      this.isConnected = true;

    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  /**
   * Initialize PostgreSQL connection
   */
  async initializePostgreSQL() {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'quicknode_db',
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    };

    this.sequelize = new Sequelize(config);
  }

  /**
   * Initialize MySQL connection
   */
  async initializeMySQL() {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'quicknode_db',
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    };

    this.sequelize = new Sequelize(config);
  }

  /**
   * Initialize SQLite connection
   */
  async initializeSQLite() {
    const dbPath = process.env.DB_PATH || './database.sqlite';
    
    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: process.env.NODE_ENV === 'development' ? console.log : false
    });
  }

  /**
   * Get Sequelize instance
   */
  getSequelize() {
    if (!this.sequelize) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.sequelize;
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.sequelize) {
      await this.sequelize.close();
      this.isConnected = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Check connection status
   */
  isConnectedToDatabase() {
    return this.isConnected;
  }
}

// Export singleton instance
const sequelizeConnection = new SequelizeConnection();
module.exports = sequelizeConnection;
