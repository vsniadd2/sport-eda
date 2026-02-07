export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_sale BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_hit BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products
    DROP COLUMN IF EXISTS is_sale,
    DROP COLUMN IF EXISTS is_hit,
    DROP COLUMN IF EXISTS is_recommended
  `);
};
