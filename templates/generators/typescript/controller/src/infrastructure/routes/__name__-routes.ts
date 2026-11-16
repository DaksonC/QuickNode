import { Router } from 'express';
import { __Name__Controller } from '../controllers/__name__-controller';

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
export function create__Name__Routes(controller: __Name__Controller) {
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
  router.post('/', controller.create);

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
  router.get('/:id', controller.getById);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
