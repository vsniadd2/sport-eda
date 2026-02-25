/**
 * Подкатегории: parent_id в categories.
 * Корневые: parent_id IS NULL; подкатегории: parent_id = id родителя.
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)');
};

export const down = async (client) => {
  await client.query('DROP INDEX IF EXISTS idx_categories_parent_id');
  await client.query('ALTER TABLE categories DROP COLUMN IF EXISTS parent_id');
};
