const { UserController } = require('../controllers/user-controller');
const { RepositoryFactory } = require('../database/repository-factory');
const { createUserRoutes } = require('../routes/user-routes');

/**
 * Wires the user feature: repository -> controller (with its use cases) -> routes.
 * `qn generate crud <name>` creates one module like this per feature.
 */
function registerUserModule(app) {
  const repository = RepositoryFactory.createUserRepository();
  app.use('/api/v1/users', createUserRoutes(new UserController(repository)));
}

module.exports = { registerUserModule };
