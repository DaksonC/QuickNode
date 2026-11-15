export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly age?: number,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  // Business logic methods can be added here
  public updateName(newName: string): User {
    return new User(this.id, newName, this.email, this.age, this.createdAt, new Date());
  }

  public updateAge(newAge: number): User {
    return new User(this.id, this.name, this.email, newAge, this.createdAt, new Date());
  }
}

export interface CreateUserData {
  name: string;
  email: string;
  age?: number;
}
