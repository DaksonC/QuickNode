const sequelizeConnection = require('../connection');
const defineUserModel = require('./user-model');

/**
 * Models Registry
 * This module initializes and exports all Sequelize models
 */
class ModelsRegistry {
  constructor() {
    this.models = {};
    this.initialized = false;
  }

  /**
   * Initialize all models
   */
  initialize() {
    if (this.initialized) {
      return this.models;
    }

    const sequelize = sequelizeConnection.getSequelize();

    // Define all models
    this.models.User = defineUserModel(sequelize);

    // Add associations here when needed
    // Example: this.models.User.hasMany(this.models.Post);

    this.initialized = true;
    return this.models;
  }

  /**
   * Get all models
   */
  getModels() {
    if (!this.initialized) {
      throw new Error('Models not initialized. Call initialize() first.');
    }
    return this.models;
  }

  /**
   * Get specific model
   */
  getModel(modelName) {
    if (!this.initialized) {
      throw new Error('Models not initialized. Call initialize() first.');
    }
    return this.models[modelName];
  }
}

// Export singleton instance
const modelsRegistry = new ModelsRegistry();
module.exports = modelsRegistry;
