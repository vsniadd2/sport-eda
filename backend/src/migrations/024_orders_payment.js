/**
 * Миграция: способ оплаты и статус оплаты заказа
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'on_delivery',
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ
  `);
  await client.query(`
    UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE orders
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS payment_status,
    DROP COLUMN IF EXISTS paid_at
  `);
};
