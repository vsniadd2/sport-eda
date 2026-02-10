export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) NULL
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products DROP COLUMN IF EXISTS sale_price
  `);
};
