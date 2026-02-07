export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS reviews');
};
