import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';

// Simple in-memory storage for demo
const users = new Map();
let idCounter = 1;

const router = Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

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
 *         createdAt:
 *           type: string
 *           format: date-time
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
 */
router.get('/', (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt
  }));
  
  res.json({
    success: true,
    data: userList
  });
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The user id
 *     responses:
 *       200:
 *         description: The user description by id
 *       404:
 *         description: The user was not found
 */
router.get('/:id', 
  param('id').notEmpty().withMessage('User ID is required'),
  validateRequest,
  (req, res) => {
    const user = users.get(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  }
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
 *       400:
 *         description: Validation error
 */
router.post('/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validateRequest,
  (req, res) => {
    const { email, name, password } = req.body;
    
    // Check if user already exists
    for (const user of users.values()) {
      if (user.email === email) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }
    }
    
    const id = (idCounter++).toString();
    const user = {
      id,
      email,
      name,
      password, // In real app, hash this!
      createdAt: new Date().toISOString()
    };
    
    users.set(id, user);
    
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  }
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
 *       404:
 *         description: The user was not found
 */
router.put('/:id',
  [
    param('id').notEmpty().withMessage('User ID is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
  ],
  validateRequest,
  (req, res) => {
    const user = users.get(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const { email, name } = req.body;
    
    if (email !== undefined) user.email = email;
    if (name !== undefined) user.name = name;
    user.updatedAt = new Date().toISOString();
    
    users.set(req.params.id, user);
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  }
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
 *         required: true
 *         description: The user id
 *     responses:
 *       204:
 *         description: The user was deleted successfully
 *       404:
 *         description: The user was not found
 */
router.delete('/:id',
  param('id').notEmpty().withMessage('User ID is required'),
  validateRequest,
  (req, res) => {
    const deleted = users.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(204).send();
  }
);

export { router as userRoutes };
