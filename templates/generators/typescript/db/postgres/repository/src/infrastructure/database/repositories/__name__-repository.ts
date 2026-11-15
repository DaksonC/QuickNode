import { Repository } from 'typeorm';
import {
  Create__Name__Data,
  __Name__,
  Update__Name__Data,
} from '../../../domain/entities/__name__';
import { __Name__Repository } from '../../../domain/repositories/__name__-repository';
import { databaseConnection } from '../connection';
import { __Name__Entity } from '../entities/__name__-entity';

export class TypeOrm__Name__Repository implements __Name__Repository {
  constructor(private readonly repository: Repository<__Name__Entity>) {}

  static create(): TypeOrm__Name__Repository {
    const repository = databaseConnection.getDataSource().getRepository(__Name__Entity);
    return new TypeOrm__Name__Repository(repository);
  }

  async findById(id: string): Promise<__Name__ | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? toDomain(entity) : null;
  }

  async findAll(): Promise<__Name__[]> {
    const entities = await this.repository.find({ order: { createdAt: 'DESC' } });
    return entities.map(toDomain);
  }

  async create(data: Create__Name__Data): Promise<__Name__> {
    const saved = await this.repository.save(this.repository.create(data));
    return toDomain(saved);
  }

  async update(id: string, data: Update__Name__Data) {
    if (Object.keys(data).length > 0) await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

function toDomain(entity: __Name__Entity): __Name__ {
  return new __Name__(entity.id, entity.name, entity.createdAt, entity.updatedAt);
}
