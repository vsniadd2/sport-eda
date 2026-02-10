import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
import { config } from './config.js';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

export const pool = new Pool(config.db);

const tz = config.timezone || 'Europe/Minsk';
pool.on('connect', (client) => {
  client.query(`SET timezone = '${tz}'`).catch((err) => console.error('SET timezone:', err));
});

async function ensureAdmin() {
  const client = await pool.connect();
  try {
    const check = await client.query(
      "SELECT id FROM users WHERE email = 'admin@gmail.com'"
    );
    if (check.rows.length === 0) {
      const hash = await bcrypt.hash('1', 10);
      try {
        await client.query(
          "INSERT INTO users (email, password_hash, role, username) VALUES ('admin@gmail.com', $1, 'admin', 'admin')",
          [hash]
        );
      } catch {
        await client.query(
          "INSERT INTO users (email, password_hash, role) VALUES ('admin@gmail.com', $1, 'admin')",
          [hash]
        );
      }
      console.log('Admin создан: admin@gmail.com / 1');
    } else {
      await client.query(
        "UPDATE users SET username = 'admin' WHERE email = 'admin@gmail.com' AND (username IS NULL OR username != 'admin')"
      ).catch(() => {});
    }
  } finally {
    client.release();
  }
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const applied = await client.query('SELECT name FROM migrations');
    const appliedSet = new Set(applied.rows.map((r) => r.name));

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.js'))
      .sort();

    for (const file of files) {
      const name = file.replace('.js', '');
      if (appliedSet.has(name)) continue;

      const mod = await import(`./migrations/${file}`);
      if (!mod.up) continue;

      await client.query('BEGIN');
      try {
        await mod.up(client);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        console.log(`✓ Миграция: ${name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log('База данных готова');
  } finally {
    client.release();
  }
}

export async function initDb() {
  await runMigrations();
  await ensureAdmin();
}
