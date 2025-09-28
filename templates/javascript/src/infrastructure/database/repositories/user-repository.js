const User = require('../../../domain/entities/user');
const modelsRegistry = require('../models');

/**
 * Sequelize User Repository Implementation
 * Works with PostgreSQL, MySQL, and SQLite through Sequelize ORM
 */
class SequelizeUserRepository {
  constructor() {
    this.UserModel = null;
  }

  /**
   * Initialize repository with Sequelize models
   */
  initialize() {
    const models = modelsRegistry.getModels();
    this.UserModel = models.User;
  }

  /**
   * Convert Sequelize model instance to domain entity
   */
  toDomainEntity(userModel) {
    if (!userModel) return null;
    
    return new User(
      userModel.id,
      userModel.name,
      userModel.email,
      userModel.age,
      userModel.createdAt,
      userModel.updatedAt
    );
  }

  async create(userData) {
    if (!this.UserModel) this.initialize();
    
    try {
      const userModel = await this.UserModel.create({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        age: userData.age
      });
      
      return this.toDomainEntity(userModel);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async findById(id) {
    if (!this.UserModel) this.initialize();
    
    const userModel = await this.UserModel.findByPk(id);
    return this.toDomainEntity(userModel);
  }

  async findByEmail(email) {
    if (!this.UserModel) this.initialize();
    
    const userModel = await this.UserModel.findOne({
      where: { email }
    });
    return this.toDomainEntity(userModel);
  }

  async findAll() {
    if (!this.UserModel) this.initialize();
    
    const userModels = await this.UserModel.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    return userModels.map(userModel => this.toDomainEntity(userModel));
  }

  async update(id, userData) {
    if (!this.UserModel) this.initialize();
    
    try {
      const [updatedRowsCount] = await this.UserModel.update(
        {
          name: userData.name,
          email: userData.email,
          age: userData.age
        },
        {
          where: { id },
          returning: true
        }
      );

      if (updatedRowsCount === 0) {
        return null;
      }

      // For PostgreSQL, Sequelize returns the updated instance
      // For other databases, we need to fetch it
      const updatedUser = await this.UserModel.findByPk(id);
      return this.toDomainEntity(updatedUser);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async delete(id) {
    if (!this.UserModel) this.initialize();
    
    const deletedRowsCount = await this.UserModel.destroy({
      where: { id }
    });
    
    return deletedRowsCount > 0;
  }
}

module.exports = SequelizeUserRepository;
