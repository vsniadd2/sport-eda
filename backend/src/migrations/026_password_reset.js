export const up = async (client) => {
  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ
  `);
};

export const down = async (client) => {
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token');
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires');
};
