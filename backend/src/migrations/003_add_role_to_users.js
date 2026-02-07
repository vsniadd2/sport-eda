export const up = async (client) => {
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'
  `);
};

export const down = async (client) => {
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS role');
};
