import { Repository } from 'typeorm';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { User, CreateUserData } from '../../../domain/entities/user';
import { UserEntity } from '../entities/user-entity';
import { databaseConnection } from '../connection';

export class PostgreSQLUserRepository implements UserRepository {
  private repository: Repository<UserEntity>;

  constructor() {
    // Repository will be initialized in the initialize method
  }

  async initialize(): Promise<void> {
    const dataSource = databaseConnection.getDataSource();
    this.repository = dataSource.getRepository(UserEntity);
  }

  async findById(id: string): Promise<User | null> {
    const userEntity = await this.repository.findOne({ where: { id } });
    return userEntity ? this.toDomain(userEntity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userEntity = await this.repository.findOne({ where: { email } });
    return userEntity ? this.toDomain(userEntity) : null;
  }

  async create(user: CreateUserData): Promise<User> {
    const userEntity = this.repository.create(user);
    const savedEntity = await this.repository.save(userEntity);
    return this.toDomain(savedEntity);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, userData);
    const updatedEntity = await this.repository.findOne({ where: { id } });
    return updatedEntity ? this.toDomain(updatedEntity) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async findAll(): Promise<User[]> {
    const userEntities = await this.repository.find();
    return userEntities.map((entity: UserEntity) => this.toDomain(entity));
  }

  private toDomain(entity: UserEntity): User {
    return new User(
      entity.id,
      entity.name,
      entity.email,
      entity.age,
      entity.createdAt,
      entity.updatedAt
    );
  }
}
