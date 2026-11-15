const InMemoryUserRepository = require('./repositories/user-repository');
// qn:imports

const userRepository = new InMemoryUserRepository();

/** Creates the repository implementations the modules depend on. */
class RepositoryFactory {
  static createUserRepository() {
    return userRepository;
  }

  // qn:factories
}

module.exports = { RepositoryFactory };
