export const up = async (client) => {
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(LOWER(username)) WHERE username IS NOT NULL
  `).catch(() => {});
};

export const down = async (client) => {
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS username');
};
