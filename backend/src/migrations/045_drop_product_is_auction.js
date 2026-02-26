export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
    DROP COLUMN IF EXISTS is_auction
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_auction BOOLEAN DEFAULT false
  `);
};
