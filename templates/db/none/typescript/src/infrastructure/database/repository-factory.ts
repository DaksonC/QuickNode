import { UserRepository } from '../../domain/repositories/user-repository';
import { InMemoryUserRepository } from './repositories/user-repository';
// qn:imports

/** Creates the repository implementations the modules depend on. */
export class RepositoryFactory {
  private static readonly userRepository = new InMemoryUserRepository();

  static async createUserRepository(): Promise<UserRepository> {
    return RepositoryFactory.userRepository;
  }

  // qn:factories
}
