import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Create__Name__Data, __Name__, Update__Name__Data } from '../../../domain/entities/__name__';
import { __Name__Repository } from '../../../domain/repositories/__name__-repository';
import { databaseConnection } from '../connection';

const TABLE = '__table__';

interface Row {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

function toDomain(row: Row): __Name__ {
  const { id, name } = row;
  return new __Name__(id, name, new Date(row.created_at), new Date(row.updated_at));
}

/** __Name__Repository on SQLite (node:sqlite); the table is created when missing. */
export class Sqlite__Name__Repository implements __Name__Repository {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  }

  static create(): Sqlite__Name__Repository {
    return new Sqlite__Name__Repository(databaseConnection.getDatabase());
  }

  async findById(id: string): Promise<__Name__ | null> {
    const row = this.db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).get(id);
    return row ? toDomain(row as unknown as Row) : null;
  }

  async findAll(): Promise<__Name__[]> {
    const rows = this.db.prepare(`SELECT * FROM ${TABLE} ORDER BY created_at DESC`).all();
    return (rows as unknown as Row[]).map(toDomain);
  }

  async create(data: Create__Name__Data): Promise<__Name__> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const insert = `INSERT INTO ${TABLE} (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`;
    this.db.prepare(insert).run(id, data.name, now, now);
    return (await this.findById(id)) as __Name__;
  }

  async update(id: string, data: Update__Name__Data) {
    const current = await this.findById(id);
    if (!current) return null;
    const update = `UPDATE ${TABLE} SET name = ?, updated_at = ? WHERE id = ?`;
    this.db.prepare(update).run(data.name ?? current.name, new Date().toISOString(), id);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.prepare(`DELETE FROM ${TABLE} WHERE id = ?`).run(id);
    return Number(result.changes) > 0;
  }
}
