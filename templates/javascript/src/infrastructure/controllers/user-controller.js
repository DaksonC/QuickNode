const {
  CreateUserUseCase,
  GetUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase
} = require('../../domain/use-cases/user-use-cases');

/**
 * User Controller
 * Handles HTTP requests and delegates to use cases
 */
class UserController {
  constructor(userRepository) {
    this.createUserUseCase = new CreateUserUseCase(userRepository);
    this.getUserUseCase = new GetUserUseCase(userRepository);
    this.updateUserUseCase = new UpdateUserUseCase(userRepository);
    this.deleteUserUseCase = new DeleteUserUseCase(userRepository);
    this.listUsersUseCase = new ListUsersUseCase(userRepository);
  }

  /**
   * Create a new user
   */
  async createUser(req, res, next) {
    try {
      const { name, email, age } = req.body;
      
      const user = await this.createUserUseCase.execute({
        name,
        email,
        age
      });
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      const user = await this.getUserUseCase.execute(id);
      
      // Remove password from response
      const { password: _, ...userResponse } = user;
      
      res.json({
        success: true,
        data: userResponse
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const user = await this.updateUserUseCase.execute(id, updateData);
      
      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await this.deleteUserUseCase.execute(id);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      
      const users = await this.listUsersUseCase.execute(limit, offset);
      
      // Remove passwords from response
      const usersResponse = users.map(user => {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json({
        success: true,
        data: usersResponse,
        pagination: {
          limit,
          offset,
          count: usersResponse.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { UserController };
