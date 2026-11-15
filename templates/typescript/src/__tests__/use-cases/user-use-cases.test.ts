import assert from 'node:assert/strict';
import { CreateUserUseCase, GetUserUseCase } from '../../domain/use-cases/user-use-cases';
import { UserRepository } from '../../domain/repositories/user-repository';
import { CreateUserData, User } from '../../domain/entities/user';

/** In-memory repository: use cases are tested without a database or mocks. */
class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find(user => user.email === email) ?? null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user = new User(String(this.users.size + 1), data.name, data.email, data.age);
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated = new User(
      id,
      data.name ?? existing.name,
      data.email ?? existing.email,
      data.age ?? existing.age,
      existing.createdAt
    );
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async findAll(): Promise<User[]> {
    return [...this.users.values()];
  }
}

describe('User Use Cases', () => {
  let repository: InMemoryUserRepository;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  describe('CreateUserUseCase', () => {
    it('creates a new user', async () => {
      const user = await new CreateUserUseCase(repository).execute({
        name: 'Test User',
        email: 'test@example.com',
        age: 30,
      });

      assert.equal(user.name, 'Test User');
      assert.equal(repository.users.size, 1);
    });

    it('rejects an email that is already taken', async () => {
      const useCase = new CreateUserUseCase(repository);
      await useCase.execute({ name: 'Test User', email: 'test@example.com' });

      await assert.rejects(
        useCase.execute({ name: 'Other User', email: 'test@example.com' }),
        /User with this email already exists/
      );
      assert.equal(repository.users.size, 1);
    });
  });

  describe('GetUserUseCase', () => {
    it('returns the user when found', async () => {
      const created = await repository.create({ name: 'Test User', email: 'test@example.com' });

      assert.deepEqual(await new GetUserUseCase(repository).execute(created.id), created);
    });

    it('returns null when the user does not exist', async () => {
      assert.equal(await new GetUserUseCase(repository).execute('999'), null);
    });
  });
});
