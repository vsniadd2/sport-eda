export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL
    )
  `);
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS categories');
};
