/**
 * No database (created with --db none): repositories keep their data in
 * memory, so it is lost on restart. Swap the repositories in
 * repository-factory.ts when a database is chosen.
 */
class DatabaseConnection {
  async initialize(): Promise<void> {}

  async ping(): Promise<void> {}

  async close(): Promise<void> {}
}

export const databaseConnection = new DatabaseConnection();
