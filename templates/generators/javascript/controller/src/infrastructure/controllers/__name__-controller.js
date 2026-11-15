const {
  Create__Name__UseCase,
  Delete__Name__UseCase,
  Get__Name__UseCase,
  GetAll__Names__UseCase,
  __Name__NotFoundError,
  Update__Name__UseCase,
} = require('../../domain/use-cases/__name__-use-cases');
const { AppError } = require('../middleware/error-handler');

/** Maps domain errors to HTTP errors. */
function toHttpError(error) {
  if (error instanceof __Name__NotFoundError) return new AppError(error.message, 404);
  return error;
}

class __Name__Controller {
  constructor(repository) {
    this.createUseCase = new Create__Name__UseCase(repository);
    this.getUseCase = new Get__Name__UseCase(repository);
    this.getAllUseCase = new GetAll__Names__UseCase(repository);
    this.updateUseCase = new Update__Name__UseCase(repository);
    this.deleteUseCase = new Delete__Name__UseCase(repository);
  }

  create = async (req, res, next) => {
    try {
      const data = await this.createUseCase.execute({ name: req.body.name });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(toHttpError(error));
    }
  };

  getById = async (req, res, next) => {
    try {
      res.json({ success: true, data: await this.getUseCase.execute(req.params.id) });
    } catch (error) {
      next(toHttpError(error));
    }
  };

  list = async (req, res, next) => {
    try {
      res.json({ success: true, data: await this.getAllUseCase.execute() });
    } catch (error) {
      next(toHttpError(error));
    }
  };

  update = async (req, res, next) => {
    try {
      const data = await this.updateUseCase.execute(req.params.id, { name: req.body.name });
      res.json({ success: true, data });
    } catch (error) {
      next(toHttpError(error));
    }
  };

  remove = async (req, res, next) => {
    try {
      await this.deleteUseCase.execute(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(toHttpError(error));
    }
  };
}

module.exports = { __Name__Controller };
