const User = require('../../../domain/entities/user');

/**
 * Sequelize User Repository Implementation
 * Works with PostgreSQL, MySQL, and SQLite through Sequelize ORM
 */
class SequelizeUserRepository {
  constructor(UserModel) {
    if (!UserModel) {
      throw new Error('Sequelize User model must be provided to the repository');
    }
    this.UserModel = UserModel;
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
    const userModel = await this.UserModel.findByPk(id);
    return this.toDomainEntity(userModel);
  }

  async findByEmail(email) {
    const userModel = await this.UserModel.findOne({
      where: { email }
    });
    return this.toDomainEntity(userModel);
  }

  async findAll() {
    const userModels = await this.UserModel.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    return userModels.map(userModel => this.toDomainEntity(userModel));
  }

  async update(id, userData) {
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
    const deletedRowsCount = await this.UserModel.destroy({
      where: { id }
    });
    
    return deletedRowsCount > 0;
  }
}

module.exports = SequelizeUserRepository;