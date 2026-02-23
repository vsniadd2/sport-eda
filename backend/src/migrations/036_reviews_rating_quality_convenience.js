export const up = async (client) => {
  await client.query(`
    ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS rating_quality INTEGER CHECK (rating_quality >= 1 AND rating_quality <= 5)
  `);
  await client.query(`
    ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS rating_convenience INTEGER CHECK (rating_convenience >= 1 AND rating_convenience <= 5)
  `);
};

export const down = async (client) => {
  await client.query('ALTER TABLE reviews DROP COLUMN IF EXISTS rating_quality');
  await client.query('ALTER TABLE reviews DROP COLUMN IF EXISTS rating_convenience');
};
