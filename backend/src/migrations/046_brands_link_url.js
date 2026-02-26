/**
 * Ссылка для карточки бренда (куда ведёт при клике).
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE brands
    ADD COLUMN IF NOT EXISTS link_url TEXT
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE brands
    DROP COLUMN IF EXISTS link_url
  `);
};
