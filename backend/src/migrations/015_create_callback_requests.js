export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS callback_requests (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      phone VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at ON callback_requests(created_at DESC)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS callback_requests');
};
