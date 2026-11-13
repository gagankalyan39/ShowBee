import { Pool, PoolClient } from 'pg';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });

import {
  dbPoolActive,
  dbPoolIdle,
  dbPoolWaiting,
  dbConnAcquisitionDuration,
  dbTransactionDuration,
  dbDeadlocks,
  dbTransactionRollbacks,
  dbQueryDuration,
} from '../metrics';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client (Microservice):', err);
});

export function updatePoolMetrics() {
  const arch = process.env.ARCHITECTURE_LABEL || 'microservice';
  const total = pool.totalCount || 0;
  const idle = pool.idleCount || 0;
  const active = Math.max(0, total - idle);
  const waiting = pool.waitingCount || 0;
  dbPoolActive.labels(arch).set(active);
  dbPoolIdle.labels(arch).set(idle);
  dbPoolWaiting.labels(arch).set(waiting);
}

export const query = async (text: string, params?: any[]) => {
  const arch = process.env.ARCHITECTURE_LABEL || 'microservice';
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.labels(arch).observe(duration);
    updatePoolMetrics();
    return res;
  } catch (err: any) {
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.labels(arch).observe(duration);
    if (err.code === '40P01') {
      dbDeadlocks.labels(arch).inc();
    }
    updatePoolMetrics();
    throw err;
  }
};

export const getClient = async (): Promise<PoolClient> => {
  const arch = process.env.ARCHITECTURE_LABEL || 'microservice';
  const startAcquire = Date.now();
  const client = await pool.connect();
  const acquireDuration = (Date.now() - startAcquire) / 1000;
  dbConnAcquisitionDuration.labels(arch).observe(acquireDuration);
  updatePoolMetrics();

  let txStartTime: number | null = null;
  const originalQuery = client.query.bind(client);

  (client as any).query = async (...args: any[]) => {
    const queryStart = Date.now();
    const queryText = typeof args[0] === 'string' ? args[0].trim().toUpperCase() : '';

    if (queryText.startsWith('BEGIN')) {
      txStartTime = Date.now();
    }

    try {
      const res = await (originalQuery as any)(...args);
      const qDuration = (Date.now() - queryStart) / 1000;
      dbQueryDuration.labels(arch).observe(qDuration);

      if (queryText.startsWith('COMMIT') && txStartTime) {
        const txDuration = (Date.now() - txStartTime) / 1000;
        dbTransactionDuration.labels(arch, 'commit').observe(txDuration);
        txStartTime = null;
      }

      return res;
    } catch (err: any) {
      const qDuration = (Date.now() - queryStart) / 1000;
      dbQueryDuration.labels(arch).observe(qDuration);

      if (err.code === '40P01') {
        dbDeadlocks.labels(arch).inc();
      }

      if ((queryText.startsWith('ROLLBACK') || err) && txStartTime) {
        const txDuration = (Date.now() - txStartTime) / 1000;
        dbTransactionDuration.labels(arch, 'rollback').observe(txDuration);
        dbTransactionRollbacks.labels(arch).inc();
        txStartTime = null;
      }

      throw err;
    }
  };

  const originalRelease = client.release.bind(client);
  client.release = (destroy?: boolean) => {
    if (txStartTime) {
      const txDuration = (Date.now() - txStartTime) / 1000;
      dbTransactionDuration.labels(arch, 'abandoned').observe(txDuration);
      dbTransactionRollbacks.labels(arch).inc();
      txStartTime = null;
    }
    const res = originalRelease(destroy);
    updatePoolMetrics();
    return res;
  };

  return client;
};

export default pool;
