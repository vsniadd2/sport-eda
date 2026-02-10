/**
 * Миграция: таблица баннеров главной страницы
 */

export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS home_banners (
      id SERIAL PRIMARY KEY,
      sort_order INT NOT NULL DEFAULT 0,
      image_data BYTEA,
      image_content_type VARCHAR(127),
      link_url VARCHAR(512),
      title VARCHAR(255)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_home_banners_sort_order ON home_banners(sort_order)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS home_banners');
};
