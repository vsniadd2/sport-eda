/**
 * Добавление полей country, servings, flavors для страницы товара.
 * country — страна производства (например: США)
 * servings — количество порций
 * flavors — JSON-массив вкусов (например: ["Шоколад","Ваниль","Клубника"])
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS servings INTEGER,
      ADD COLUMN IF NOT EXISTS flavors TEXT
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products
      DROP COLUMN IF EXISTS country,
      DROP COLUMN IF EXISTS servings,
      DROP COLUMN IF EXISTS flavors
  `);
};
