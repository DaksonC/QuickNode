import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import {
  Create__Name__UseCase,
  Delete__Name__UseCase,
  Get__Name__UseCase,
  GetAll__Names__UseCase,
  __Name__NotFoundError,
  Update__Name__UseCase,
} from '../../domain/use-cases/__name__-use-cases';
import { Create__Name__Dto, Update__Name__Dto } from '../http/dtos/__name__-dtos';
import { AppError } from '../middleware/error-handler';

/** Validates a request body against a DTO class (400 when invalid). */
async function parse<T extends object>(Dto: new () => T, body: unknown): Promise<T> {
  // Express 5 leaves req.body undefined when the request has no JSON body.
  const dto = plainToInstance(Dto, body ?? {});
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const details = errors.map(error => Object.values(error.constraints ?? {}).join(', '));
    throw new AppError(`Validation failed: ${details.join('; ')}`, 400);
  }
  return dto;
}

/** Maps domain errors to HTTP errors. */
function toHttpError(error: unknown): unknown {
  if (error instanceof __Name__NotFoundError) return new AppError(error.message, 404);
  return error;
}

export class __Name__Controller {
  constructor(
    private readonly createUseCase: Create__Name__UseCase,
    private readonly getUseCase: Get__Name__UseCase,
    private readonly getAllUseCase: GetAll__Names__UseCase,
    private readonly updateUseCase: Update__Name__UseCase,
    private readonly deleteUseCase: Delete__Name__UseCase
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await parse(Create__Name__Dto, req.body);
      res.status(201).json({ success: true, data: await this.createUseCase.execute(data) });
    } catch (error) {
      next(toHttpError(error));
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ success: true, data: await this.getUseCase.execute(req.params.id) });
    } catch (error) {
      next(toHttpError(error));
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ success: true, data: await this.getAllUseCase.execute() });
    } catch (error) {
      next(toHttpError(error));
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await parse(Update__Name__Dto, req.body);
      res.json({ success: true, data: await this.updateUseCase.execute(req.params.id, data) });
    } catch (error) {
      next(toHttpError(error));
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUseCase.execute(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(toHttpError(error));
    }
  };
}
