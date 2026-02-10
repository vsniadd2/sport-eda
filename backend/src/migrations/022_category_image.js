/**
 * Миграция: добавление изображения для категорий
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS image_data BYTEA,
    ADD COLUMN IF NOT EXISTS image_content_type VARCHAR(100)
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE categories
    DROP COLUMN IF EXISTS image_data,
    DROP COLUMN IF EXISTS image_content_type
  `);
};
