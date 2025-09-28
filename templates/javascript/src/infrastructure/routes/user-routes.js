const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

function createUserRoutes(userController) {
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
   *       properties:
   *         id:
   *           type: string
   *           description: The auto-generated id of the user
   *         name:
   *           type: string
   *           description: The user name
   *         email:
   *           type: string
   *           description: The user email
   *         age:
   *           type: integer
   *           description: The user age
   *         createdAt:
   *           type: string
   *           format: date-time
   *         updatedAt:
   *           type: string
   *           format: date-time
   */

  /**
   * @swagger
   * /api/v1/users:
   *   get:
   *     summary: Returns the list of all users
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of users to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of users to skip
   *     responses:
   *       200:
   *         description: The list of users
   */
  router.get('/', (req, res, next) => userController.listUsers(req, res, next));

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
    [
      param('id').notEmpty().withMessage('User ID is required')
    ],
    validate,
    (req, res, next) => userController.getUserById(req, res, next)
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
   *               - name
   *               - email
   *             properties:
   *               name:
   *                 type: string
   *                 description: The user's name
   *               email:
   *                 type: string
   *                 format: email
   *                 description: The user's email
   *               age:
   *                 type: integer
   *                 description: The user's age
   *     responses:
   *       201:
   *         description: User created successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/',
    [
      body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
      body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
      body('age')
        .optional()
        .isInt({ min: 0, max: 150 })
        .withMessage('Age must be a number between 0 and 150')
    ],
    validate,
    (req, res, next) => userController.createUser(req, res, next)
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
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               age:
   *                 type: integer
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
      body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
      body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be a number between 0 and 150')
    ],
    validate,
    (req, res, next) => userController.updateUser(req, res, next)
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
   *       200:
   *         description: The user was deleted successfully
   *       404:
   *         description: The user was not found
   */
  router.delete('/:id',
    [
      param('id').notEmpty().withMessage('User ID is required')
    ],
    validate,
    (req, res, next) => userController.deleteUser(req, res, next)
  );

  return router;
}

module.exports = { createUserRoutes };