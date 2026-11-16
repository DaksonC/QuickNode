const __Name__ = require('../../../domain/entities/__name__');
const { __Name__Repository } = require('../../../domain/repositories/__name__-repository');

const toDomain = model =>
  model ? new __Name__(model.id, model.name, model.createdAt, model.updatedAt) : null;

class Sequelize__Name__Repository extends __Name__Repository {
  constructor(Model) {
    super();
    this.Model = Model;
  }

  async findById(id) {
    return toDomain(await this.Model.findByPk(id));
  }

  async findAll() {
    const models = await this.Model.findAll({ order: [['createdAt', 'DESC']] });
    return models.map(toDomain);
  }

  async create(data) {
    return toDomain(await this.Model.create({ name: data.name }));
  }

  async update(id, data) {
    const model = await this.Model.findByPk(id);
    if (!model) return null;
    if (data.name !== undefined) await model.update({ name: data.name });
    return toDomain(model);
  }

  async delete(id) {
    return (await this.Model.destroy({ where: { id } })) > 0;
  }
}

module.exports = { Sequelize__Name__Repository };
