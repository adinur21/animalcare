import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'animalcare',
  user: process.env.DB_USER || 'animalcare_user',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT || 5000)
};

export function createPool() {
  return new Pool(config);
}

export const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error', err);
});

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
