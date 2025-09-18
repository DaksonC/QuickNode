import { UserRepository } from '../../../domain/repositories/user-repository.js';
import { User, CreateUserData } from '../../../domain/entities/user.js';
import { UserModel, IUserDocument } from '../models/user-model.js';

export class MongoUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const userDoc = await UserModel.findById(id);
    return userDoc ? this.toDomain(userDoc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userDoc = await UserModel.findOne({ email });
    return userDoc ? this.toDomain(userDoc) : null;
  }

  async create(user: CreateUserData): Promise<User> {
    const userDoc = new UserModel(user);
    const savedDoc = await userDoc.save();
    return this.toDomain(savedDoc);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const userDoc = await UserModel.findByIdAndUpdate(
      id,
      { $set: userData },
      { new: true, runValidators: true }
    );
    return userDoc ? this.toDomain(userDoc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return result !== null;
  }

  async findAll(): Promise<User[]> {
    const userDocs = await UserModel.find();
    return userDocs.map(doc => this.toDomain(doc));
  }

  private toDomain(doc: IUserDocument): User {
    return new User(
      doc._id.toString(),
      doc.email,
      doc.name,
      doc.password,
      doc.createdAt,
      doc.updatedAt
    );
  }
}
