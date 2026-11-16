const { randomUUID } = require('node:crypto');
const __Name__ = require('../../../domain/entities/__name__');
const { __Name__Repository } = require('../../../domain/repositories/__name__-repository');

/** __Name__ repository kept in memory: data is lost when the process stops. */
class InMemory__Name__Repository extends __Name__Repository {
  constructor() {
    super();
    this.items = new Map();
  }

  async findById(id) {
    return this.items.get(id) ?? null;
  }

  async findAll() {
    return [...this.items.values()].reverse();
  }

  async create(data) {
    const item = new __Name__(randomUUID(), data.name);
    this.items.set(item.id, item);
    return item;
  }

  async update(id, data) {
    const current = this.items.get(id);
    if (!current) return null;
    const updated = data.name === undefined ? current : current.rename(data.name);
    this.items.set(id, updated);
    return updated;
  }

  async delete(id) {
    return this.items.delete(id);
  }
}

module.exports = { InMemory__Name__Repository };
