import 'reflect-metadata';
import 'dotenv/config';

console.log('🌱 Starting simple seeder test...');

async function testConnection() {
  try {
    console.log('Importing DataSource...');
    const { DataSource } = await import('typeorm');
    
    console.log('Importing UserEntity...');
    const { UserEntity } = await import('./src/infrastructure/database/entities/user-entity');
    
    console.log('Creating DataSource...');
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'quicknode_db',
      entities: [UserEntity],
      synchronize: true,
      logging: true
    });
    
    console.log('Initializing DataSource...');
    await dataSource.initialize();
    console.log('✅ DataSource initialized!');
    
    console.log('Creating user...');
    const userRepository = dataSource.getRepository(UserEntity);
    
    const user = userRepository.create({
      name: 'Test User',
      email: 'test@example.com',
      age: 30
    });
    
    const savedUser = await userRepository.save(user);
    console.log('✅ User created:', savedUser);
    
    await dataSource.destroy();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConnection();
