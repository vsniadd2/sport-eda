/**
 * Миграция: выставить остаток 100 у товаров с нулевым количеством
 * (для мок/сидов и уже существующих товаров без quantity)
 */

export const up = async (client) => {
  await client.query(`
    UPDATE products SET quantity = 100 WHERE quantity = 0
  `);
};

export const down = async () => {};
