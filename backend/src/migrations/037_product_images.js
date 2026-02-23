/**
 * Таблица до 4 изображений на товар (дополнительно к основному в products)
 */

export const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      image_data BYTEA,
      image_content_type VARCHAR(100)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)');
};

export const down = async (client) => {
  await client.query('DROP TABLE IF EXISTS product_images');
};
