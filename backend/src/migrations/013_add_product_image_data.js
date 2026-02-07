export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS image_data BYTEA,
    ADD COLUMN IF NOT EXISTS image_content_type VARCHAR(100)
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products
    DROP COLUMN IF EXISTS image_data,
    DROP COLUMN IF EXISTS image_content_type
  `);
};
