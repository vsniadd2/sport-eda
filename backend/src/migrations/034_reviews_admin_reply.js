/**
 * Миграция: ответ админа на отзыв
 */

export const up = async (client) => {
  await client.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT`);
  await client.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_replied_at TIMESTAMPTZ`);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE reviews
    DROP COLUMN IF EXISTS admin_reply,
    DROP COLUMN IF EXISTS admin_replied_at
  `);
};
