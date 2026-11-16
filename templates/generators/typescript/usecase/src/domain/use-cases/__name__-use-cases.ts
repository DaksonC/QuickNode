import { Create__Name__Data, __Name__, Update__Name__Data } from '../entities/__name__';
import { __Name__Repository } from '../repositories/__name__-repository';

export class __Name__NotFoundError extends Error {
  constructor(id: string) {
    super(`__Label__ ${id} not found`);
    this.name = '__Name__NotFoundError';
  }
}

export class Create__Name__UseCase {
  constructor(private readonly repository: __Name__Repository) {}

  async execute(data: Create__Name__Data): Promise<__Name__> {
    return this.repository.create(data);
  }
}

export class Get__Name__UseCase {
  constructor(private readonly repository: __Name__Repository) {}

  async execute(id: string): Promise<__Name__> {
    const found = await this.repository.findById(id);
    if (!found) throw new __Name__NotFoundError(id);
    return found;
  }
}

export class GetAll__Names__UseCase {
  constructor(private readonly repository: __Name__Repository) {}

  async execute(): Promise<__Name__[]> {
    return this.repository.findAll();
  }
}

export class Update__Name__UseCase {
  constructor(private readonly repository: __Name__Repository) {}

  async execute(id: string, data: Update__Name__Data): Promise<__Name__> {
    const updated = await this.repository.update(id, data);
    if (!updated) throw new __Name__NotFoundError(id);
    return updated;
  }
}

export class Delete__Name__UseCase {
  constructor(private readonly repository: __Name__Repository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new __Name__NotFoundError(id);
  }
}
