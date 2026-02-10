/**
 * Миграция: точное количество товара (остаток на складе)
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 0
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products
    DROP COLUMN IF EXISTS quantity
  `);
};
