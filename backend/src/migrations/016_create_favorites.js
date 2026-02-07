export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, product_id)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS favorites');
};
