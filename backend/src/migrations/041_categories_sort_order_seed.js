/**
 * Задаёт начальную последовательность категорий:
 * корневые — 0, 1, 2… по id; подкатегории внутри родителя — 0, 1, 2… по id.
 */

export const up = async (client) => {
  await client.query(`
    WITH roots AS (
      SELECT id, (ROW_NUMBER() OVER (ORDER BY id) - 1)::int AS ord
      FROM categories
      WHERE parent_id IS NULL
    )
    UPDATE categories c
    SET sort_order = roots.ord
    FROM roots
    WHERE c.id = roots.id
  `);
  await client.query(`
    WITH subs AS (
      SELECT id, (ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY id) - 1)::int AS ord
      FROM categories
      WHERE parent_id IS NOT NULL
    )
    UPDATE categories c
    SET sort_order = subs.ord
    FROM subs
    WHERE c.id = subs.id
  `);
};

export const down = async () => {
  /* не сбрасываем значения — при откате 040 колонка удалится */
};
