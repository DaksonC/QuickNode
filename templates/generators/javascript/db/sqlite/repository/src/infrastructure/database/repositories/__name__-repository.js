const { randomUUID } = require('node:crypto');
const __Name__ = require('../../../domain/entities/__name__');
const { __Name__Repository } = require('../../../domain/repositories/__name__-repository');

const TABLE = '__table__';

function toDomain(row) {
  if (!row) return null;
  const { id, name } = row;
  return new __Name__(id, name, new Date(row.created_at), new Date(row.updated_at));
}

/** __Name__ repository on SQLite (node:sqlite); the table is created when missing. */
class Sqlite__Name__Repository extends __Name__Repository {
  constructor(db) {
    super();
    this.db = db;
    db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  }

  async findById(id) {
    return toDomain(this.db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).get(id));
  }

  async findAll() {
    const rows = this.db.prepare(`SELECT * FROM ${TABLE} ORDER BY created_at DESC`).all();
    return rows.map(toDomain);
  }

  async create(data) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const insert = `INSERT INTO ${TABLE} (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`;
    this.db.prepare(insert).run(id, data.name, now, now);
    return this.findById(id);
  }

  async update(id, data) {
    const current = await this.findById(id);
    if (!current) return null;
    const update = `UPDATE ${TABLE} SET name = ?, updated_at = ? WHERE id = ?`;
    this.db.prepare(update).run(data.name ?? current.name, new Date().toISOString(), id);
    return this.findById(id);
  }

  async delete(id) {
    const result = this.db.prepare(`DELETE FROM ${TABLE} WHERE id = ?`).run(id);
    return Number(result.changes) > 0;
  }
}

module.exports = { Sqlite__Name__Repository };
