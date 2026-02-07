export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      status VARCHAR(50) DEFAULT 'pending',
      total DECIMAL(10,2) NOT NULL,
      address TEXT,
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS orders');
};
