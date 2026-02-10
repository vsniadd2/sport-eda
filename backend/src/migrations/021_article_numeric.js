/**
 * Миграция: изменение артикула на числовой с автогенерацией
 * - Тип article меняется с VARCHAR(100) на INTEGER
 * - Создается уникальный индекс
 * - Автогенерация 6-значного уникального числа (100000-999999)
 */

export const up = async (client) => {
  // 1. Удаляем старое поле article (если есть данные, они будут потеряны)
  await client.query(`
    ALTER TABLE products 
    DROP COLUMN IF EXISTS article
  `);

  // 2. Добавляем новое поле article как INTEGER
  await client.query(`
    ALTER TABLE products 
    ADD COLUMN article INTEGER
  `);

  // 3. Создаем уникальный индекс
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_article 
    ON products(article) 
    WHERE article IS NOT NULL
  `);

  // 4. Создаем функцию для генерации уникального артикула
  await client.query(`
    CREATE OR REPLACE FUNCTION generate_unique_article()
    RETURNS INTEGER AS $$
    DECLARE
      new_article INTEGER;
      done BOOLEAN;
    BEGIN
      done := FALSE;
      WHILE NOT done LOOP
        new_article := floor(random() * 900000 + 100000)::INTEGER;
        done := NOT EXISTS (SELECT 1 FROM products WHERE article = new_article);
      END LOOP;
      RETURN new_article;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 5. Создаем триггер для автоматической генерации артикула при вставке
  await client.query(`
    CREATE OR REPLACE FUNCTION set_article_on_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.article IS NULL THEN
        NEW.article := generate_unique_article();
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await client.query(`
    DROP TRIGGER IF EXISTS trigger_set_article ON products;
    CREATE TRIGGER trigger_set_article
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION set_article_on_insert();
  `);

  // 6. Заполняем артикулы для существующих товаров
  await client.query(`
    UPDATE products 
    SET article = generate_unique_article() 
    WHERE article IS NULL
  `);
};

export const down = async (client) => {
  // Удаляем триггер и функции
  await client.query(`DROP TRIGGER IF EXISTS trigger_set_article ON products`);
  await client.query(`DROP FUNCTION IF EXISTS set_article_on_insert()`);
  await client.query(`DROP FUNCTION IF EXISTS generate_unique_article()`);
  await client.query(`DROP INDEX IF EXISTS idx_products_article`);

  // Возвращаем поле article как VARCHAR
  await client.query(`ALTER TABLE products DROP COLUMN IF EXISTS article`);
  await client.query(`ALTER TABLE products ADD COLUMN article VARCHAR(100)`);
};
