/**
 * Порядок категорий в каталоге: sort_order (0 = первый).
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0
  `);
  await client.query(
    'CREATE INDEX IF NOT EXISTS idx_categories_sort_order_parent ON categories(sort_order, parent_id)'
  );
};

export const down = async (client) => {
  await client.query('DROP INDEX IF EXISTS idx_categories_sort_order_parent');
  await client.query('ALTER TABLE categories DROP COLUMN IF EXISTS sort_order');
};
