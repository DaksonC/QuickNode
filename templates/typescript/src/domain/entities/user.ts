import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly password: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  // Business logic methods can be added here
  public updateName(newName: string): User {
    return new User(
      this.id,
      this.email,
      newName,
      this.password,
      this.createdAt,
      new Date()
    );
  }
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
}

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
