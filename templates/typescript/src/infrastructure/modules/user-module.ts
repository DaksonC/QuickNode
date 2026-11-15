import { Express } from 'express';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  GetAllUsersUseCase,
  GetUserUseCase,
  UpdateUserUseCase,
} from '../../domain/use-cases/user-use-cases';
import { UserController } from '../controllers/user-controller';
import { RepositoryFactory } from '../database/repository-factory';
import { createUserRoutes } from '../routes/user-routes';

/**
 * Wires the user feature: repository -> use cases -> controller -> routes.
 * `qn generate crud <name>` creates one module like this per feature.
 */
export async function registerUserModule(app: Express): Promise<void> {
  const repository = await RepositoryFactory.createUserRepository();
  const controller = new UserController(
    new CreateUserUseCase(repository),
    new GetUserUseCase(repository),
    new GetAllUsersUseCase(repository),
    new UpdateUserUseCase(repository),
    new DeleteUserUseCase(repository)
  );
  app.use('/api/v1/users', createUserRoutes(controller));
}
