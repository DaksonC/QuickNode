const { databaseConnection } = require('./connection');
const SqliteUserRepository = require('./repositories/user-repository');
// qn:imports

/** Creates the repository implementations the modules depend on. */
class RepositoryFactory {
  static createUserRepository() {
    return new SqliteUserRepository(databaseConnection.getDatabase());
  }

  // qn:factories
}

module.exports = { RepositoryFactory };
