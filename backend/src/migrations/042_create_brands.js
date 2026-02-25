/**
 * Миграция: таблица брендов (для страницы «Бренды» / О магазине)
 */

export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS brands (
      id SERIAL PRIMARY KEY,
      sort_order INT NOT NULL DEFAULT 0,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      image_data BYTEA,
      image_content_type VARCHAR(127),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_brands_sort_order ON brands(sort_order)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS brands');
};
