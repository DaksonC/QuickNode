const { randomUUID } = require('node:crypto');
const User = require('../entities/user');

/** The user does not exist (HTTP 404). */
class UserNotFoundError extends Error {
  constructor() {
    super('User not found');
    this.name = 'UserNotFoundError';
  }
}

/** The email belongs to another user (HTTP 409). */
class UserConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserConflictError';
  }
}

/** Required data is missing (HTTP 400). */
class UserValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserValidationError';
  }
}

/**
 * Use case for creating a new user
 */
class CreateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userData) {
    // Validate required fields
    if (!userData.email || !userData.name) {
      throw new UserValidationError('Email and name are required');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new UserConflictError('User with this email already exists');
    }

    // Create user domain object
    const user = new User(randomUUID(), userData.name, userData.email, userData.age);

    // Save to repository
    return await this.userRepository.create({
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
    });
  }
}

/**
 * Use case for getting a user by ID
 */
class GetUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    if (!userId) {
      throw new UserValidationError('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  }
}

/**
 * Use case for updating a user
 */
class UpdateUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userId, updateData) {
    if (!userId) {
      throw new UserValidationError('User ID is required');
    }

    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new UserNotFoundError();
    }

    // If email is being updated, check if it's already taken
    if (updateData.email && updateData.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(updateData.email);
      if (userWithEmail) {
        throw new UserConflictError('Email already in use');
      }
    }

    return await this.userRepository.update(userId, updateData);
  }
}

/**
 * Use case for deleting a user
 */
class DeleteUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    if (!userId) {
      throw new UserValidationError('User ID is required');
    }

    const deleted = await this.userRepository.delete(userId);
    if (!deleted) {
      throw new UserNotFoundError();
    }

    return { success: true, message: 'User deleted successfully' };
  }
}

/**
 * Use case for listing users
 */
class ListUsersUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(limit = 10, offset = 0) {
    return await this.userRepository.findAll(limit, offset);
  }
}

module.exports = {
  UserNotFoundError,
  UserConflictError,
  UserValidationError,
  CreateUserUseCase,
  GetUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase,
};
