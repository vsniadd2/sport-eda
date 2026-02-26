/**
 * Одно поле «Как принимать» — текст, который админ заполняет сам.
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS how_to_take TEXT
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products
    DROP COLUMN IF EXISTS how_to_take
  `);
};
