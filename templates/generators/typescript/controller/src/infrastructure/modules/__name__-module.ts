import { Express } from 'express';
import {
  Create__Name__UseCase,
  Delete__Name__UseCase,
  Get__Name__UseCase,
  GetAll__Names__UseCase,
  Update__Name__UseCase,
} from '../../domain/use-cases/__name__-use-cases';
import { __Name__Controller } from '../controllers/__name__-controller';
import { RepositoryFactory } from '../database/repository-factory';
import { create__Name__Routes } from '../routes/__name__-routes';

/** Wires the __label__ feature: repository -> use cases -> controller -> routes. */
export function register__Name__Module(app: Express): void {
  const repository = RepositoryFactory.create__Name__Repository();
  const controller = new __Name__Controller(
    new Create__Name__UseCase(repository),
    new Get__Name__UseCase(repository),
    new GetAll__Names__UseCase(repository),
    new Update__Name__UseCase(repository),
    new Delete__Name__UseCase(repository)
  );
  app.use('/api/v1/__names__', create__Name__Routes(controller));
}
