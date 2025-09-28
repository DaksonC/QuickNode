const SequelizeUserRepository = require('./repositories/user-repository');
const modelsRegistry = require('./models');

/**
 * Repository Factory
 * Creates appropriate repository instances based on database type
 */
class RepositoryFactory {
  static createUserRepository() {
    const dbType = process.env.DB_TYPE || 'postgresql';
    
    switch (dbType.toLowerCase()) {
      case 'postgresql':
      case 'postgres':
      case 'mysql':
      case 'sqlite':
        // All SQL databases use Sequelize repository
        const { User } = modelsRegistry.getModels();
        return new SequelizeUserRepository(User);
      
      case 'mongodb':
      case 'mongo':
        // TODO: Implement MongoDB repository (would use Mongoose)
        throw new Error('MongoDB repository not implemented yet');
      
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}

module.exports = { RepositoryFactory };
