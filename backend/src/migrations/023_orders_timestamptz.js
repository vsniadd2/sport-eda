/**
 * Миграция: orders.created_at в TIMESTAMPTZ для корректного времени с timezone
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE orders
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE orders
    ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'UTC'
  `);
};
