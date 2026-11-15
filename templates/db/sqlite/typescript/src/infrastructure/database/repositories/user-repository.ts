import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { CreateUserData, User } from '../../../domain/entities/user';
import { UserRepository } from '../../../domain/repositories/user-repository';

interface UserRow {
  id: string;
  name: string;
  email: string;
  age: number | null;
  created_at: string;
  updated_at: string;
}

const toDomain = (row: UserRow): User =>
  new User(
    row.id,
    row.name,
    row.email,
    row.age ?? undefined,
    new Date(row.created_at),
    new Date(row.updated_at)
  );

/** UserRepository on SQLite (node:sqlite); the table is created when missing. */
export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      age INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
  }

  async findById(id: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
      UserRow | undefined;
    return row ? toDomain(row) : null;
  }

  async create(user: CreateUserData): Promise<User> {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO users (id, name, email, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(id, user.name, user.email, user.age ?? null, now, now);
    return (await this.findById(id)) as User;
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
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

  async delete(id: string): Promise<boolean> {
    return Number(this.db.prepare('DELETE FROM users WHERE id = ?').run(id).changes) > 0;
  }

  async findAll(): Promise<User[]> {
    const rows = this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all() as unknown as UserRow[];
    return rows.map(toDomain);
  }
}
