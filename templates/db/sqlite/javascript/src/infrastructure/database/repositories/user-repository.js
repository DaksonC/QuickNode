const { randomUUID } = require('node:crypto');
const User = require('../../../domain/entities/user');

const toDomain = row =>
  row
    ? new User(
        row.id,
        row.name,
        row.email,
        row.age ?? undefined,
        new Date(row.created_at),
        new Date(row.updated_at)
      )
    : null;

/** User repository on SQLite (node:sqlite); the table is created when missing. */
class SqliteUserRepository {
  constructor(db) {
    this.db = db;
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      age INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  }

  async create(userData) {
    const id = userData.id ?? randomUUID();
    const now = new Date().toISOString();
    try {
      this.db
        .prepare(
          'INSERT INTO users (id, name, email, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(id, userData.name, userData.email, userData.age ?? null, now, now);
    } catch (error) {
      if (/UNIQUE/.test(error.message)) throw new Error('Email already exists', { cause: error });
      throw error;
    }
    return this.findById(id);
  }

  async findById(id) {
    return toDomain(this.db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  }

  async findByEmail(email) {
    return toDomain(this.db.prepare('SELECT * FROM users WHERE email = ?').get(email));
  }

  async findAll() {
    return this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all().map(toDomain);
  }

  async update(id, userData) {
    const current = await this.findById(id);
    if (!current) return null;
    this.db
      .prepare('UPDATE users SET name = ?, email = ?, age = ?, updated_at = ? WHERE id = ?')
      .run(
        userData.name ?? current.name,
        userData.email ?? current.email,
        userData.age ?? current.age ?? null,
        new Date().toISOString(),
        id
      );
    return this.findById(id);
  }

  async delete(id) {
    return Number(this.db.prepare('DELETE FROM users WHERE id = ?').run(id).changes) > 0;
  }
}

module.exports = SqliteUserRepository;
