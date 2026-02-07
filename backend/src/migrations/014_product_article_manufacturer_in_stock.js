export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS article VARCHAR(100),
    ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
    ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT true
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products
    DROP COLUMN IF EXISTS article,
    DROP COLUMN IF EXISTS manufacturer,
    DROP COLUMN IF EXISTS in_stock
  `);
};
