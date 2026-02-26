import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/**
 * Возвращает список товаров для каталога по параметрам (для HTTP и WS).
 * @param {{ category?: string, search?: string, price_min?: number, price_max?: number, sale?: boolean }} params
 * @returns {Promise<Array>}
 */
export async function getCatalogProducts(params = {}) {
  const categorySlug = params.category || null;
  const searchTerm = (params.search && String(params.search).trim()) || '';
  const priceMin = params.price_min != null && params.price_min !== '' ? parseFloat(params.price_min) : null;
  const priceMax = params.price_max != null && params.price_max !== '' ? parseFloat(params.price_max) : null;
  const saleOnly = params.sale === true || params.sale === 'true' || params.sale === '1';
  const hasPriceFilter = (priceMin != null && !Number.isNaN(priceMin)) || (priceMax != null && !Number.isNaN(priceMax));

  let query = `
    SELECT p.id, p.name, p.description, p.weight, p.price, p.sale_price, p.image_url, p.article, p.manufacturer,
           (p.image_data IS NOT NULL OR (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) > 0) AS has_image,
           (SELECT COUNT(*)::int FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
           COALESCE(p.in_stock, true) AS in_stock,
           COALESCE(p.quantity, 0)::int AS quantity,
           COALESCE(p.is_sale, false) AS is_sale,
           COALESCE(p.is_hit, false) AS is_hit,
           COALESCE(p.is_recommended, false) AS is_recommended,
           c.id as category_id, c.name as category_name, c.slug as category_slug
    FROM products p
    JOIN categories c ON p.category_id = c.id
  `;
  const queryParams = [];
  let paramIndex = 1;
  const conditions = [];

  if (saleOnly) {
    conditions.push('COALESCE(p.is_sale, false) = true');
  }
  if (categorySlug) {
    conditions.push(`c.slug = $${paramIndex++}`);
    queryParams.push(categorySlug);
  }
  if (searchTerm) {
    const term = `%${searchTerm}%`;
    const isNumeric = /^\d+$/.test(searchTerm);
    // Поиск по названию, описанию, категории, производителю, артикулу (частичное); для числа — ещё точное совпадение артикула
    conditions.push(
      `(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR COALESCE(p.manufacturer, '') ILIKE $${paramIndex} OR p.article::text ILIKE $${paramIndex}` +
      (isNumeric ? ` OR p.article = $${paramIndex + 1})` : ')')
    );
    queryParams.push(term);
    if (isNumeric) {
      queryParams.push(parseInt(searchTerm, 10));
      paramIndex += 2;
    } else {
      paramIndex += 1;
    }
  }
  if (hasPriceFilter) {
    const effectivePrice = '(CASE WHEN COALESCE(p.is_sale, false) AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.price END)';
    if (priceMin != null && !Number.isNaN(priceMin)) {
      conditions.push(`${effectivePrice} >= $${paramIndex++}`);
      queryParams.push(priceMin);
    }
    if (priceMax != null && !Number.isNaN(priceMax)) {
      conditions.push(`${effectivePrice} <= $${paramIndex++}`);
      queryParams.push(priceMax);
    }
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY c.id, p.id';

  const result = await pool.query(query, queryParams);
  return result.rows;
}

router.get('/', async (req, res) => {
  try {
    const { category: categorySlug, search: searchTerm, ids: idsParam, sort: sortParam, limit: limitParam, price_min: priceMinParam, price_max: priceMaxParam, sale: saleParam } = req.query;
    const sortBySales = sortParam === 'sales';
    const saleOnly = saleParam === 'true' || saleParam === '1';
    const limitNum = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), 100) : null;
    const priceMin = priceMinParam != null && priceMinParam !== '' ? parseFloat(priceMinParam) : null;
    const priceMax = priceMaxParam != null && priceMaxParam !== '' ? parseFloat(priceMaxParam) : null;
    const hasPriceFilter = (priceMin != null && !Number.isNaN(priceMin)) || (priceMax != null && !Number.isNaN(priceMax));

    let query;
    const params = [];
    let paramIndex = 1;

    if (sortBySales && categorySlug) {
      query = `
        WITH sold AS (
          SELECT oi.product_id, COALESCE(SUM(oi.quantity), 0)::int AS qty
          FROM order_items oi
          GROUP BY oi.product_id
        )
        SELECT p.id, p.name, p.description, p.weight, p.price, p.sale_price, p.image_url, p.article, p.manufacturer,
               p.flavors,
               (p.image_data IS NOT NULL OR (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) > 0) AS has_image,
               (SELECT COUNT(*)::int FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
               COALESCE(p.in_stock, true) AS in_stock,
               COALESCE(p.quantity, 0)::int AS quantity,
               COALESCE(p.is_sale, false) AS is_sale,
               COALESCE(p.is_hit, false) AS is_hit,
               COALESCE(p.is_recommended, false) AS is_recommended,
               c.id AS category_id, c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN sold s ON s.product_id = p.id
        WHERE c.slug = $${paramIndex++}
        ${saleOnly ? ' AND COALESCE(p.is_sale, false) = true' : ''}
      `;
      params.push(categorySlug);
      if (hasPriceFilter) {
        const effectivePrice = '(CASE WHEN COALESCE(p.is_sale, false) AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.price END)';
        if (priceMin != null && !Number.isNaN(priceMin)) {
          query += ` AND ${effectivePrice} >= $${paramIndex++}`;
          params.push(priceMin);
        }
        if (priceMax != null && !Number.isNaN(priceMax)) {
          query += ` AND ${effectivePrice} <= $${paramIndex++}`;
          params.push(priceMax);
        }
      }
      if (searchTerm && String(searchTerm).trim()) {
        const term = `%${String(searchTerm).trim()}%`;
        const trimmedSearch = String(searchTerm).trim();
        const isNumeric = /^\d+$/.test(trimmedSearch);
        query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR COALESCE(p.manufacturer, '') ILIKE $${paramIndex} OR p.article::text ILIKE $${paramIndex}`;
        if (isNumeric) {
          query += ` OR p.article = $${paramIndex + 1})`;
          params.push(term);
          params.push(parseInt(trimmedSearch, 10));
          paramIndex += 2;
        } else {
          query += ')';
          params.push(term);
          paramIndex += 1;
        }
      }
      query += ' ORDER BY COALESCE(s.qty, 0) DESC, p.id';
      if (limitNum) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limitNum);
      }
    } else {
      query = `
        SELECT p.id, p.name, p.description, p.weight, p.price, p.sale_price, p.image_url, p.article, p.manufacturer,
               p.flavors,
               (p.image_data IS NOT NULL OR (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) > 0) AS has_image,
               (SELECT COUNT(*)::int FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
               COALESCE(p.in_stock, true) AS in_stock,
               COALESCE(p.quantity, 0)::int AS quantity,
               COALESCE(p.is_sale, false) AS is_sale,
               COALESCE(p.is_hit, false) AS is_hit,
               COALESCE(p.is_recommended, false) AS is_recommended,
               c.id as category_id, c.name as category_name, c.slug as category_slug
        FROM products p
        JOIN categories c ON p.category_id = c.id
      `;
      const conditions = [];
      if (saleOnly) {
        conditions.push('COALESCE(p.is_sale, false) = true');
      }
      if (idsParam && String(idsParam).trim()) {
        const ids = String(idsParam).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
        if (ids.length) {
          conditions.push(`p.id = ANY($${paramIndex}::int[])`);
          params.push(ids);
          paramIndex += 1;
        }
      }
      if (categorySlug) {
        conditions.push(`c.slug = $${paramIndex++}`);
        params.push(categorySlug);
      }
      if (searchTerm && String(searchTerm).trim()) {
        const term = `%${String(searchTerm).trim()}%`;
        const trimmedSearch = String(searchTerm).trim();
        const isNumeric = /^\d+$/.test(trimmedSearch);
        conditions.push(
          `(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR COALESCE(p.manufacturer, '') ILIKE $${paramIndex} OR p.article::text ILIKE $${paramIndex}` +
          (isNumeric ? ` OR p.article = $${paramIndex + 1})` : ')')
        );
        params.push(term);
        if (isNumeric) {
          params.push(parseInt(trimmedSearch, 10));
          paramIndex += 2;
        } else {
          paramIndex += 1;
        }
      }
      if (hasPriceFilter) {
        const effectivePrice = '(CASE WHEN COALESCE(p.is_sale, false) AND p.sale_price IS NOT NULL THEN p.sale_price ELSE p.price END)';
        if (priceMin != null && !Number.isNaN(priceMin)) {
          conditions.push(`${effectivePrice} >= $${paramIndex++}`);
          params.push(priceMin);
        }
        if (priceMax != null && !Number.isNaN(priceMax)) {
          conditions.push(`${effectivePrice} <= $${paramIndex++}`);
          params.push(priceMax);
        }
      }
      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY c.id, p.id';
      if (limitNum) {
        query += ` LIMIT $${paramIndex}`;
        params.push(limitNum);
      }
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, parent_id, COALESCE(sort_order, 0) AS sort_order, (image_data IS NOT NULL) AS has_image
       FROM categories
       ORDER BY COALESCE(sort_order, 0) ASC, parent_id NULLS FIRST, id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение изображения категории
router.get('/categories/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT image_data, image_content_type FROM categories WHERE id = $1',
      [id]
    );
    if (!result.rows[0] || !result.rows[0].image_data) {
      return res.status(404).json({ message: 'Изображение не найдено' });
    }
    const { image_data, image_content_type } = result.rows[0];
    res.set('Content-Type', image_content_type || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(image_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Глобальный поиск по товарам и категориям
router.get('/search', async (req, res) => {
  try {
    const { q, limit: limitParam } = req.query;
    const searchTerm = String(q || '').trim();
    if (!searchTerm) {
      return res.json({ products: [], categories: [] });
    }

    const limitNum = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 20);
    const term = `%${searchTerm}%`;
    const isNumeric = /^\d+$/.test(searchTerm);
    const articleExact = isNumeric ? parseInt(searchTerm, 10) : null;

    // Поиск товаров: название, описание, категория, производитель, артикул (частичное + точное для числа)
    const productsQuery = `
      SELECT p.id, p.name, p.article, p.price, p.sale_price,
             (p.image_data IS NOT NULL) AS has_image,
             COALESCE(p.is_sale, false) AS is_sale,
             c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE (p.name ILIKE $1 OR p.description ILIKE $1 OR c.name ILIKE $1 OR COALESCE(p.manufacturer, '') ILIKE $1 OR p.article::text ILIKE $1${articleExact != null ? ' OR p.article = $2' : ''})
      ORDER BY ${articleExact != null ? 'CASE WHEN p.article = $2 THEN 0 ELSE 1 END, ' : ''}p.name
      LIMIT $${articleExact != null ? 3 : 2}
    `;
    const productsParams = articleExact != null ? [term, articleExact, limitNum] : [term, limitNum];

    // Поиск категорий
    const categoriesQuery = `
      SELECT id, name, slug, (image_data IS NOT NULL) AS has_image
      FROM categories
      WHERE name ILIKE $1
      ORDER BY name
      LIMIT $2
    `;

    const [productsResult, categoriesResult] = await Promise.all([
      pool.query(productsQuery, productsParams),
      pool.query(categoriesQuery, [term, 5]),
    ]);

    res.json({
      products: productsResult.rows,
      categories: categoriesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const fromPi = await pool.query(
      'SELECT image_data, image_content_type FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC LIMIT 1',
      [id]
    );
    if (fromPi.rows[0]?.image_data) {
      const { image_data, image_content_type } = fromPi.rows[0];
      res.set('Content-Type', image_content_type || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(image_data);
    }
    const fromProd = await pool.query(
      'SELECT image_data, image_content_type FROM products WHERE id = $1',
      [id]
    );
    if (!fromProd.rows[0] || !fromProd.rows[0].image_data) {
      return res.status(404).json({ message: 'Изображение не найдено' });
    }
    const { image_data, image_content_type } = fromProd.rows[0];
    res.set('Content-Type', image_content_type || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(image_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/:id/images/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index, 10);
    if (Number.isNaN(idx) || idx < 0 || idx > 9) {
      return res.status(400).json({ message: 'Индекс изображения от 0 до 9' });
    }
    const fromPi = await pool.query(
      'SELECT image_data, image_content_type FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC OFFSET $2 LIMIT 1',
      [id, idx]
    );
    if (fromPi.rows[0]?.image_data) {
      const { image_data, image_content_type } = fromPi.rows[0];
      res.set('Content-Type', image_content_type || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(image_data);
    }
    if (idx === 0) {
      const fromProd = await pool.query(
        'SELECT image_data, image_content_type FROM products WHERE id = $1',
        [id]
      );
      if (fromProd.rows[0]?.image_data) {
        const { image_data, image_content_type } = fromProd.rows[0];
        res.set('Content-Type', image_content_type || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400');
        return res.send(image_data);
      }
    }
    return res.status(404).json({ message: 'Изображение не найдено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.category_id, p.name, p.description, p.weight, p.price, p.sale_price, p.image_url, p.article, p.manufacturer,
              p.country, p.servings, p.flavors,
              (p.image_data IS NOT NULL OR (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) > 0) AS has_image,
              (SELECT COUNT(*)::int FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
              COALESCE(p.in_stock, true) AS in_stock,
              COALESCE(p.quantity, 0)::int AS quantity,
              COALESCE(p.is_sale, false) AS is_sale,
              COALESCE(p.is_hit, false) AS is_hit,
              COALESCE(p.is_recommended, false) AS is_recommended,
              c.name as category_name, c.slug as category_slug,
              p.short_description, p.trust_badges, p.how_to_use_intro, p.how_to_use_step1, p.how_to_use_step2, p.how_to_use_step3,
              COALESCE(p.show_how_to_use, true) AS show_how_to_use,
              COALESCE(p.show_related, true) AS show_related
       FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = $1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Товар не найден' });
    const row = result.rows[0];
    if (row.trust_badges && typeof row.trust_badges === 'string') {
      try {
        row.trust_badges = JSON.parse(row.trust_badges);
      } catch {
        row.trust_badges = null;
      }
    }
    if (!Array.isArray(row.trust_badges)) row.trust_badges = null;
    if (row.flavors && typeof row.flavors === 'string') {
      try {
        row.flavors = JSON.parse(row.flavors);
      } catch {
        row.flavors = null;
      }
    }
    if (!Array.isArray(row.flavors)) row.flavors = null;
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
