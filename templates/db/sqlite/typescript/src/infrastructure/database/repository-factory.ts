import { UserRepository } from '../../domain/repositories/user-repository';
import { databaseConnection } from './connection';
import { SqliteUserRepository } from './repositories/user-repository';
// qn:imports

/** Creates the repository implementations the modules depend on. */
export class RepositoryFactory {
  static async createUserRepository(): Promise<UserRepository> {
    return new SqliteUserRepository(databaseConnection.getDatabase());
  }

  // qn:factories
}
