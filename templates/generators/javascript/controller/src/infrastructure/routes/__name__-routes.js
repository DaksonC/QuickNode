const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Factories: validation chains are mutable, so every route gets its own.
const nameRule = () => body('name').isString().trim().isLength({ min: 1, max: 255 });
const idRule = () => param('id').isUUID().withMessage('id must be a UUID');

/**
 * @swagger
 * components:
 *   schemas:
 *     __Name__:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     __Name__Input:
 *       type: object
 *       required: [name]
 *       properties:
 *         name:
 *           type: string
 */
function create__Name__Routes(controller) {
  const router = Router();

  /**
   * @swagger
   * /api/v1/__names__:
   *   get:
   *     summary: List __labels__
   *     tags: [__Names__]
   *     responses:
   *       200:
   *         description: All __labels__
   *   post:
   *     summary: Create a __label__
   *     tags: [__Names__]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/__Name__Input'
   *     responses:
   *       201:
   *         description: The created __label__
   *       400:
   *         description: Validation error
   */
  router.get('/', controller.list);
  router.post('/', [nameRule()], validate, controller.create);

  /**
   * @swagger
   * /api/v1/__names__/{id}:
   *   parameters:
   *     - in: path
   *       name: id
   *       required: true
   *       schema:
   *         type: string
   *   get:
   *     summary: Get a __label__ by id
   *     tags: [__Names__]
   *     responses:
   *       200:
   *         description: The __label__
   *       404:
   *         description: Not found
   *   put:
   *     summary: Update a __label__
   *     tags: [__Names__]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/__Name__Input'
   *     responses:
   *       200:
   *         description: The updated __label__
   *       404:
   *         description: Not found
   *   delete:
   *     summary: Delete a __label__
   *     tags: [__Names__]
   *     responses:
   *       204:
   *         description: Deleted
   *       404:
   *         description: Not found
   */
  router.get('/:id', [idRule()], validate, controller.getById);
  router.put('/:id', [idRule(), nameRule().optional()], validate, controller.update);
  router.delete('/:id', [idRule()], validate, controller.remove);

  return router;
}

module.exports = { create__Name__Routes };
