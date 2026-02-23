/**
 * Настройки индивидуальной страницы товара для админа.
 * short_description — краткое описание под заголовком (если пусто, используется начало description).
 * trust_badges — JSON-массив до 5 строк для бейджей доверия (например ["Лабораторно проверено","Гарантия качества"]).
 * how_to_use_intro — текст над шагами в блоке «Как использовать».
 * how_to_use_step1, step2, step3 — тексты шагов; если все пустые, показываются значения по умолчанию.
 * show_how_to_use — показывать ли блок «Как использовать» (по умолчанию true).
 * show_related — показывать ли блок «Рекомендуемые товары» (по умолчанию true).
 */

export const up = async (client) => {
  await client.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS short_description TEXT,
      ADD COLUMN IF NOT EXISTS trust_badges TEXT,
      ADD COLUMN IF NOT EXISTS how_to_use_intro TEXT,
      ADD COLUMN IF NOT EXISTS how_to_use_step1 TEXT,
      ADD COLUMN IF NOT EXISTS how_to_use_step2 TEXT,
      ADD COLUMN IF NOT EXISTS how_to_use_step3 TEXT,
      ADD COLUMN IF NOT EXISTS show_how_to_use BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_related BOOLEAN DEFAULT true
  `);
};

export const down = async (client) => {
  await client.query(`
    ALTER TABLE products
      DROP COLUMN IF EXISTS short_description,
      DROP COLUMN IF EXISTS trust_badges,
      DROP COLUMN IF EXISTS how_to_use_intro,
      DROP COLUMN IF EXISTS how_to_use_step1,
      DROP COLUMN IF EXISTS how_to_use_step2,
      DROP COLUMN IF EXISTS how_to_use_step3,
      DROP COLUMN IF EXISTS show_how_to_use,
      DROP COLUMN IF EXISTS show_related
  `);
};
