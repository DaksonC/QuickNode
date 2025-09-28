import { databaseConnection } from './connection';
import { UserRepository } from '../../domain/repositories/user-repository';

/**
 * Repository Factory for TypeScript
 * Creates and returns the appropriate repository based on database type
 */
export class RepositoryFactory {
  static async createUserRepository(): Promise<UserRepository> {
    const dbType = databaseConnection.getType();
    
    switch (dbType) {
      case 'postgresql': {
        const { PostgreSQLUserRepository } = await import('./repositories/user-repository');
        const repository = await PostgreSQLUserRepository.create();
        return repository;
      }

      case 'mongodb': {
        // TODO: Implement MongoDB repository
        throw new Error('MongoDB repository not yet implemented');
      }
      
      case 'mysql': {
        // TODO: Implement MySQL repository
        throw new Error('MySQL repository not yet implemented');
      }
      
      case 'sqlite': {
        // TODO: Implement SQLite repository
        throw new Error('SQLite repository not yet implemented');
      }
      
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}
