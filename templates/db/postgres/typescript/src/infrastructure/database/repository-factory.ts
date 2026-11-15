import { UserRepository } from '../../domain/repositories/user-repository';
import { PostgreSQLUserRepository } from './repositories/user-repository';
// qn:imports

/** Creates the repository implementations the modules depend on. */
export class RepositoryFactory {
  static async createUserRepository(): Promise<UserRepository> {
    return PostgreSQLUserRepository.create();
  }

  // qn:factories
}
