import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function setup() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🔧 Running database migrations...');
    const migrationFile = path.join(__dirname, '../../../database/migrations/001_init_schema.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    await client.query(migrationSQL);
    console.log('✅ Schema created successfully');

    console.log('🌱 Running seed data...');
    const seedFile = path.join(__dirname, '../../../database/seeds/001_seed_data.sql');
    const seedSQL = fs.readFileSync(seedFile, 'utf8');
    await client.query(seedSQL);
    console.log('✅ Seed data inserted successfully');

    console.log('🎉 Database setup complete!');
    console.log('');
    console.log('📧 Login credentials:');
    console.log('   Admin: admin@showbee.com / Admin@123');
    console.log('   User:  user@showbee.com  / Admin@123');
  } catch (err) {
    console.error('❌ Database setup failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(console.error);
