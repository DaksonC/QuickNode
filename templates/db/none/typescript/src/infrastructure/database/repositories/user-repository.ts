import { randomUUID } from 'node:crypto';
import { CreateUserData, User } from '../../../domain/entities/user';
import { UserRepository } from '../../../domain/repositories/user-repository';

/** UserRepository kept in memory: data is lost when the process stops. */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find(user => user.email === email) ?? null;
  }

  async create(user: CreateUserData): Promise<User> {
    const created = new User(randomUUID(), user.name, user.email, user.age);
    this.users.set(created.id, created);
    return created;
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const current = this.users.get(id);
    if (!current) return null;
    const updated = new User(
      id,
      userData.name ?? current.name,
      userData.email ?? current.email,
      userData.age ?? current.age,
      current.createdAt,
      new Date()
    );
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async findAll(): Promise<User[]> {
    return [...this.users.values()].reverse();
  }
}
