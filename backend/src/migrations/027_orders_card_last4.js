/**
 * Миграция: последние 4 цифры карты для заказов с оплатой картой
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4)
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE orders
    DROP COLUMN IF EXISTS card_last4
  `);
};
