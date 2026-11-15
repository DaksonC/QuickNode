class __Name__NotFoundError extends Error {
  constructor(id) {
    super(`__Label__ ${id} not found`);
    this.name = '__Name__NotFoundError';
  }
}

class Create__Name__UseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(data) {
    return this.repository.create(data);
  }
}

class Get__Name__UseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(id) {
    const found = await this.repository.findById(id);
    if (!found) throw new __Name__NotFoundError(id);
    return found;
  }
}

class GetAll__Names__UseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute() {
    return this.repository.findAll();
  }
}

class Update__Name__UseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(id, data) {
    const updated = await this.repository.update(id, data);
    if (!updated) throw new __Name__NotFoundError(id);
    return updated;
  }
}

class Delete__Name__UseCase {
  constructor(repository) {
    this.repository = repository;
  }

  async execute(id) {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new __Name__NotFoundError(id);
  }
}

module.exports = {
  __Name__NotFoundError,
  Create__Name__UseCase,
  Get__Name__UseCase,
  GetAll__Names__UseCase,
  Update__Name__UseCase,
  Delete__Name__UseCase,
};
