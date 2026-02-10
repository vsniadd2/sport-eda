/**
 * Миграция: таблица тикетов обратной связи
 */

export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS feedback_tickets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_feedback_tickets_user_id ON feedback_tickets(user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_feedback_tickets_created_at ON feedback_tickets(created_at DESC)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS feedback_tickets');
};
