import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserController } from '../controllers/user-controller.js';
import { validateRequest } from '../middleware/validation.js';
// Note: Import your repository implementation here
// import { PostgreSQLUserRepository } from '../database/repositories/postgresql-user-repository.js';
// import { MongoUserRepository } from '../database/repositories/mongo-user-repository.js';
import {
  CreateUserUseCase,
  GetUserUseCase,
  GetAllUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase
} from '../../domain/use-cases/user-use-cases.js';

// For this example, we'll use a mock repository
// In real implementation, choose between PostgreSQL or MongoDB repository
class MockUserRepository {
  private users = new Map();
  private idCounter = 1;

  async findById(id: string) {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async create(userData: any) {
    const id = (this.idCounter++).toString();
    const user = {
      id,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async update(id: string, userData: any) {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...userData, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async delete(id: string) {
    return this.users.delete(id);
  }

  async findAll() {
    return Array.from(this.users.values());
  }
}

// Initialize repository and use cases
const userRepository = new MockUserRepository();
const createUserUseCase = new CreateUserUseCase(userRepository);
const getUserUseCase = new GetUserUseCase(userRepository);
const getAllUsersUseCase = new GetAllUsersUseCase(userRepository);
const updateUserUseCase = new UpdateUserUseCase(userRepository);
const deleteUserUseCase = new DeleteUserUseCase(userRepository);

// Initialize controller
const userController = new UserController(
  createUserUseCase,
  getUserUseCase,
  getAllUsersUseCase,
  updateUserUseCase,
  deleteUserUseCase
);

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - name
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user
 *         email:
 *           type: string
 *           description: The user email
 *         name:
 *           type: string
 *           description: The user name
 *         password:
 *           type: string
 *           description: The user password
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The user creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The user last update date
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Returns the list of all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: The list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/', userController.getAllUsers.bind(userController));

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user id
 *     responses:
 *       200:
 *         description: The user description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: The user was not found
 */
router.get(
  '/:id',
  param('id').notEmpty().withMessage('User ID is required'),
  validateRequest,
  userController.getUserById.bind(userController)
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: The user was created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validateRequest,
  userController.createUser.bind(userController)
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: The user was updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: The user was not found
 */
router.put(
  '/:id',
  [
    param('id').notEmpty().withMessage('User ID is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
  ],
  validateRequest,
  userController.updateUser.bind(userController)
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user id
 *     responses:
 *       204:
 *         description: The user was deleted successfully
 *       404:
 *         description: The user was not found
 */
router.delete(
  '/:id',
  param('id').notEmpty().withMessage('User ID is required'),
  validateRequest,
  userController.deleteUser.bind(userController)
);

export { router as userRoutes };
