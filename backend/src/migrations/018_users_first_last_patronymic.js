export const up = async (client) => {
  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS patronymic VARCHAR(100)
  `);
  await client.query(`
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL
  `).catch(() => {});
};

export const down = async (client) => {
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS first_name');
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS last_name');
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS patronymic');
};
