import { randomUUID } from 'node:crypto';
import {
  Create__Name__Data,
  __Name__,
  Update__Name__Data,
} from '../../../domain/entities/__name__';
import { __Name__Repository } from '../../../domain/repositories/__name__-repository';

/** __Name__Repository kept in memory: data is lost when the process stops. */
export class InMemory__Name__Repository implements __Name__Repository {
  private readonly items = new Map<string, __Name__>();

  static create(): InMemory__Name__Repository {
    return new InMemory__Name__Repository();
  }

  async findById(id: string): Promise<__Name__ | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(): Promise<__Name__[]> {
    return [...this.items.values()].reverse();
  }

  async create(data: Create__Name__Data): Promise<__Name__> {
    const item = new __Name__(randomUUID(), data.name);
    this.items.set(item.id, item);
    return item;
  }

  async update(id: string, data: Update__Name__Data) {
    const current = this.items.get(id);
    if (!current) return null;
    const updated = data.name === undefined ? current : current.rename(data.name);
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
