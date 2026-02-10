/**
 * Миграция: таблица учёта посещений сайта (1 запись = 1 посетитель в день)
 */

export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS site_visits (
      visit_date DATE NOT NULL,
      visitor_key VARCHAR(255) NOT NULL,
      PRIMARY KEY (visit_date, visitor_key)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_site_visits_visit_date ON site_visits(visit_date)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS site_visits');
};
