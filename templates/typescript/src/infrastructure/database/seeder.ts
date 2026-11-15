import '../config/load-env';
import { RepositoryFactory } from './repository-factory';
import { databaseConnection } from './connection';

/**
 * Database Seeder
 * Creates initial data for development using TypeORM
 */
export class DatabaseSeeder {
  static async run(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...');

      // Initialize database connection
      await databaseConnection.initialize();

      // Get repository
      const userRepository = await RepositoryFactory.createUserRepository();

      // Check if users already exist
      const existingUsers = await userRepository.findAll();
      if (existingUsers.length > 0) {
        console.log('📊 Database already has data, skipping seed');
        return;
      }

      // Create sample users
      const sampleUsers = [
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          age: 30,
        },
        {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          age: 25,
        },
        {
          name: 'Admin User',
          email: 'admin@quicknode.com',
          age: 35,
        },
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
      await databaseConnection.close();
    }
  }
}

// Run seeder if called directly
async function runSeeder() {
  await DatabaseSeeder.run();
  process.exit(0);
}

// Execute seeder
runSeeder().catch(error => {
  console.error(error);
  process.exit(1);
});
