const { randomUUID } = require('node:crypto');
const User = require('../../../domain/entities/user');

/** User repository kept in memory: data is lost when the process stops. */
class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
  }

  async create(userData) {
    if (await this.findByEmail(userData.email)) throw new Error('Email already exists');
    const user = new User(userData.id ?? randomUUID(), userData.name, userData.email, userData.age);
    this.users.set(user.id, user);
    return user;
  }

  async findById(id) {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email) {
    return [...this.users.values()].find(user => user.email === email) ?? null;
  }

  async findAll() {
    return [...this.users.values()].reverse();
  }

  async update(id, userData) {
    const current = this.users.get(id);
    if (!current) return null;
    const updated = new User(
      id,
      userData.name ?? current.name,
      userData.email ?? current.email,
      userData.age ?? current.age,
      current.createdAt,
      new Date()
    );
    this.users.set(id, updated);
    return updated;
  }

  async delete(id) {
    return this.users.delete(id);
  }
}

module.exports = InMemoryUserRepository;
