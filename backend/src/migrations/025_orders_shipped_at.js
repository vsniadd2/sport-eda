/**
 * Миграция: дата отправки заказа (когда админ нажал «Отправлен»)
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE orders
    DROP COLUMN IF EXISTS shipped_at
  `);
};
