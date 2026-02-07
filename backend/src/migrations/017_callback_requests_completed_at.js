export const up = async (client) => {
  await client.query(`
    ALTER TABLE callback_requests
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_callback_requests_completed_at ON callback_requests(completed_at)');
};

export const down = async (client) => {
  await client.query('ALTER TABLE callback_requests DROP COLUMN IF EXISTS completed_at');
};
