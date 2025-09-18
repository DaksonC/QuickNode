import { CreateUserUseCase, GetUserUseCase } from '../../domain/use-cases/user-use-cases.js';
import { UserRepository } from '../../domain/repositories/user-repository.js';
import { User } from '../../domain/entities/user.js';

describe('User Use Cases', () => {
  let mockUserRepository: jest.Mocked<UserRepository>;
  let createUserUseCase: CreateUserUseCase;
  let getUserUseCase: GetUserUseCase;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };

    createUserUseCase = new CreateUserUseCase(mockUserRepository);
    getUserUseCase = new GetUserUseCase(mockUserRepository);
  });

  describe('CreateUserUseCase', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };
      
      const expectedUser = new User(
        '1',
        userData.email,
        userData.name,
        userData.password,
        new Date(),
        new Date()
      );

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(expectedUser);

      // Act
      const result = await createUserUseCase.execute(userData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
    });

    it('should throw error if user already exists', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const existingUser = new User(
        '1',
        userData.email,
        userData.name,
        userData.password,
        new Date(),
        new Date()
      );

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(createUserUseCase.execute(userData)).rejects.toThrow(
        'User with this email already exists'
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('GetUserUseCase', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = '1';
      const expectedUser = new User(
        userId,
        'test@example.com',
        'Test User',
        'password123',
        new Date(),
        new Date()
      );

      mockUserRepository.findById.mockResolvedValue(expectedUser);

      // Act
      const result = await getUserUseCase.execute(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const userId = '999';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await getUserUseCase.execute(userId);

      // Assert
      expect(result).toBeNull();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });
});
