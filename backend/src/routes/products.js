import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category: categorySlug, search: searchTerm, ids: idsParam, sort: sortParam, limit: limitParam } = req.query;
    const sortBySales = sortParam === 'sales';
    const limitNum = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), 100) : null;

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
               (p.image_data IS NOT NULL) AS has_image,
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
      `;
      params.push(categorySlug);
      if (searchTerm && String(searchTerm).trim()) {
        const term = `%${String(searchTerm).trim()}%`;
        const trimmedSearch = String(searchTerm).trim();
        const isNumeric = /^\d+$/.test(trimmedSearch);
        if (isNumeric) {
          // Поиск по артикулу (точное совпадение числа)
          query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.article = $${paramIndex + 1})`;
          params.push(term);
          params.push(parseInt(trimmedSearch, 10));
          paramIndex += 2;
        } else {
          query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
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
               (p.image_data IS NOT NULL) AS has_image,
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
        if (isNumeric) {
          // Поиск по артикулу (точное совпадение числа) + по названию/описанию
          conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.article = $${paramIndex + 1})`);
          params.push(term);
          params.push(parseInt(trimmedSearch, 10));
          paramIndex += 2;
        } else {
          // Поиск по названию, описанию и категории
          conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
          params.push(term);
          paramIndex += 1;
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
      `SELECT id, name, slug, (image_data IS NOT NULL) AS has_image FROM categories ORDER BY id`
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

    // Поиск товаров
    let productsQuery;
    let productsParams;
    if (isNumeric) {
      productsQuery = `
        SELECT p.id, p.name, p.article, p.price, p.sale_price,
               (p.image_data IS NOT NULL) AS has_image,
               COALESCE(p.is_sale, false) AS is_sale,
               c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.name ILIKE $1 OR p.article = $2
        ORDER BY CASE WHEN p.article = $2 THEN 0 ELSE 1 END, p.name
        LIMIT $3
      `;
      productsParams = [term, parseInt(searchTerm, 10), limitNum];
    } else {
      productsQuery = `
        SELECT p.id, p.name, p.article, p.price, p.sale_price,
               (p.image_data IS NOT NULL) AS has_image,
               COALESCE(p.is_sale, false) AS is_sale,
               c.name AS category_name, c.slug AS category_slug
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.name ILIKE $1 OR c.name ILIKE $1 OR p.article::text ILIKE $1
        ORDER BY p.name
        LIMIT $2
      `;
      productsParams = [term, limitNum];
    }

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
    const result = await pool.query(
      'SELECT image_data, image_content_type FROM products WHERE id = $1',
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

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.category_id, p.name, p.description, p.weight, p.price, p.sale_price, p.image_url, p.article, p.manufacturer,
              (p.image_data IS NOT NULL) AS has_image,
              COALESCE(p.in_stock, true) AS in_stock,
              COALESCE(p.quantity, 0)::int AS quantity,
              COALESCE(p.is_sale, false) AS is_sale,
              COALESCE(p.is_hit, false) AS is_hit,
              COALESCE(p.is_recommended, false) AS is_recommended,
              c.name as category_name, c.slug as category_slug
       FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = $1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Товар не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
