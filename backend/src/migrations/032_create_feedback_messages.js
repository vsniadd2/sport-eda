/**
 * Миграция: таблица сообщений в тикетах обратной связи
 */

export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS feedback_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES feedback_tickets(id) ON DELETE CASCADE,
      author VARCHAR(20) NOT NULL CHECK (author IN ('user', 'admin')),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_feedback_messages_ticket_id ON feedback_messages(ticket_id)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS feedback_messages');
};
