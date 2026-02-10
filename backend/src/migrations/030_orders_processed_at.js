/**
 * Миграция: дата обработки заказа (админ отметил «Обработка заказа»)
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE orders
    DROP COLUMN IF EXISTS processed_at
  `);
};
