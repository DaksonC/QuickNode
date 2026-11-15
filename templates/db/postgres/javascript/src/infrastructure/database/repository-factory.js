const SequelizeUserRepository = require('./repositories/user-repository');
const modelsRegistry = require('./models');
// qn:imports

/** Creates the repository implementations the modules depend on. */
class RepositoryFactory {
  static createUserRepository() {
    const { User } = modelsRegistry.getModels();
    return new SequelizeUserRepository(User);
  }

  // qn:factories
}

module.exports = { RepositoryFactory };
