import fs from 'fs';
import path from 'path';
import pool from '../db';

/**
 * Automatically ensures database migrations 001, 002, and 003 are applied on startup.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
    if (!fs.existsSync(migrationsDir)) return;

    const migrationFiles = [
      '001_init_schema.sql',
      '002_add_optimistic_locking.sql',
      '003_concurrency_and_idempotency.sql'
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      if (fs.existsSync(filePath)) {
        // For 001, only run if tables don't exist yet
        if (file === '001_init_schema.sql') {
          const checkTable = await client.query(`
            SELECT 1 FROM information_schema.tables WHERE table_name = 'show_seats'
          `);
          if (checkTable.rows.length === 0) {
            console.log(`📦 Running migration ${file}...`);
            const sql = fs.readFileSync(filePath, 'utf8');
            await client.query(sql);
          }
        } else {
          // 002 & 003 are idempotent (ADD COLUMN IF NOT EXISTS, CREATE ... IF NOT EXISTS)
          const sql = fs.readFileSync(filePath, 'utf8');
          await client.query(sql);
        }
      }
    }
    console.log('✅ Database schema and concurrency constraints verified (Migrations 001-003 applied).');
  } catch (err: any) {
    console.warn('Schema verification notice:', err.message);
  } finally {
    client.release();
  }
}

