import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import pool, { getClient } from '../db';

const JWT_SECRET = (process.env.JWT_SECRET || 'showbee_super_secret_jwt_key_2024_change_in_production').trim();
const NUM_USERS = 250;

export async function seedBenchmarkUsers() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Create 250 benchmark users if they do not exist
    await client.query(`
      INSERT INTO users (id, name, email, phone, password_hash, role, is_active)
      SELECT 
        gen_random_uuid(),
        'Bench User ' || i,
        'bench_user_' || i || '@showbee.test',
        '99999999' || LPAD(i::text, 2, '0'),
        '$2a$12$w01p4j4w.6fF99Fp/y4rMe3XhWJ3d0v8vR1vB2f3h4j5k6l7m8n9o',
        'USER',
        true
      FROM generate_series(1, $1) AS i
      ON CONFLICT (email) DO NOTHING;
    `, [NUM_USERS]);

    await client.query('COMMIT');

    // Fetch the 250 users
    const res = await client.query(`
      SELECT id, email, role
      FROM users
      WHERE email LIKE 'bench_user_%@showbee.test'
      ORDER BY email ASC
      LIMIT $1
    `, [NUM_USERS]);

    const tokens = res.rows.map((u) => {
      return jwt.sign(
        { userId: u.id, role: u.role, email: u.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
    });

    const outputPath = path.resolve(__dirname, '../../../load-test/k6/tokens.json');
    fs.writeFileSync(outputPath, JSON.stringify(tokens, null, 2), 'utf-8');

    console.log(JSON.stringify({
      success: true,
      usersCount: res.rows.length,
      tokensGenerated: tokens.length,
      outputPath,
    }));
    return tokens;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed benchmark users:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedBenchmarkUsers()
    .then(() => pool.end())
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}

