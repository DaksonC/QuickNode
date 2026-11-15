const { __Name__Controller } = require('../controllers/__name__-controller');
const { RepositoryFactory } = require('../database/repository-factory');
const { create__Name__Routes } = require('../routes/__name__-routes');

/** Wires the __label__ feature: repository -> controller (with its use cases) -> routes. */
function register__Name__Module(app) {
  const repository = RepositoryFactory.create__Name__Repository();
  const controller = new __Name__Controller(repository);
  app.use('/api/v1/__names__', create__Name__Routes(controller));
}

module.exports = { register__Name__Module };
