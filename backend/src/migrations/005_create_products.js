export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id),
      name VARCHAR(500) NOT NULL,
      description TEXT,
      weight VARCHAR(100),
      price DECIMAL(10,2) NOT NULL,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS products');
};
