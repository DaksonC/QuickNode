/**
 * No database (created with --db none): repositories keep their data in
 * memory, so it is lost on restart. Swap the repositories in
 * repository-factory.js when a database is chosen.
 */
class DatabaseConnection {
  async initialize() {}

  async ping() {}

  async close() {}
}

const databaseConnection = new DatabaseConnection();
module.exports = { databaseConnection };
