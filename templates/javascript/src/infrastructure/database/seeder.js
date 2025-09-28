require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const sequelizeConnection = require('./connection');
const modelsRegistry = require('./models');
const { RepositoryFactory } = require('./repository-factory');

/**
 * Database Seeder
 * Creates initial data for development using Sequelize ORM
 */
class DatabaseSeeder {
  static async run() {
    try {
      console.log('🌱 Starting database seeding...');
      
      // Initialize database connection
      await sequelizeConnection.initialize();
      
      // Initialize models
      modelsRegistry.initialize();
      
      // Sync database (create tables if they don't exist)
      await sequelizeConnection.getSequelize().sync({ force: false, alter: true });
      console.log('Database tables synchronized');
      
      // Get repository
      const userRepository = RepositoryFactory.createUserRepository();
      
      // Check if users already exist
      const existingUsers = await userRepository.findAll();
      if (existingUsers.length > 0) {
        console.log('📊 Database already has data, skipping seed');
        return;
      }
      
      // Create sample users
      const sampleUsers = [
        {
          id: uuidv4(),
          name: 'John Doe',
          email: 'john.doe@example.com',
          age: 30
        },
        {
          id: uuidv4(),
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          age: 25
        },
        {
          id: uuidv4(),
          name: 'Admin User',
          email: 'admin@quicknode.com',
          age: 35
        }
      ];
      
      for (const userData of sampleUsers) {
        await userRepository.create(userData);
        console.log(`✅ Created user: ${userData.name}`);
      }
      
      console.log('🎉 Database seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    } finally {
      await sequelizeConnection.close();
    }
  }
}

// Run seeder if called directly
if (require.main === module) {
  DatabaseSeeder.run()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { DatabaseSeeder };
