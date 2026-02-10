import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const BEST_PRODUCTS_LIMIT = 8;

/**
 * GET /api/home
 * Для главной: лучшие предложения (по продажам, затем по рейтингу),
 * популярные категории (по сумме покупок товаров категории).
 */
router.get('/', async (req, res) => {
  try {
    const [productsResult, categoriesResult] = await Promise.all([
      pool.query(`
        WITH sold AS (
          SELECT oi.product_id, COALESCE(SUM(oi.quantity), 0)::int AS qty
          FROM order_items oi
          GROUP BY oi.product_id
        ),
        avg_rating AS (
          SELECT product_id, ROUND(AVG(rating)::numeric, 2) AS rating
          FROM reviews
          GROUP BY product_id
        )
        SELECT p.id, p.name, p.description, p.weight, p.price, p.sale_price, p.image_url, p.article, p.manufacturer,
               (p.image_data IS NOT NULL) AS has_image,
               COALESCE(p.in_stock, true) AS in_stock,
               COALESCE(p.quantity, 0)::int AS quantity,
               COALESCE(p.is_sale, false) AS is_sale,
               COALESCE(p.is_hit, false) AS is_hit,
               COALESCE(p.is_recommended, false) AS is_recommended,
               c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
               COALESCE(s.qty, 0) AS purchases
        FROM products p
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN sold s ON s.product_id = p.id
        LEFT JOIN avg_rating ar ON ar.product_id = p.id
        ORDER BY COALESCE(s.qty, 0) DESC, COALESCE(ar.rating, 0) DESC, p.id
        LIMIT $1
      `, [BEST_PRODUCTS_LIMIT * 4]),
      pool.query(`
        WITH cat_sold AS (
          SELECT p.category_id, COALESCE(SUM(oi.quantity), 0)::int AS qty
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          GROUP BY p.category_id
        )
        SELECT c.id, c.name, c.slug, (c.image_data IS NOT NULL) AS has_image, COALESCE(cs.qty, 0) AS purchases
        FROM categories c
        LEFT JOIN cat_sold cs ON cs.category_id = c.id
        ORDER BY COALESCE(cs.qty, 0) DESC, c.id
      `),
    ]);

    const bestProducts = productsResult.rows.map(({ purchases, ...p }) => p);
    const popularCategories = categoriesResult.rows.map(({ purchases, ...c }) => c);

    res.json({ bestProducts, popularCategories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/**
 * GET /api/home/banners — список баннеров для главной (публичный)
 */
router.get('/banners', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sort_order, link_url, title, (image_data IS NOT NULL) AS has_image
       FROM home_banners
       ORDER BY sort_order ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/**
 * GET /api/home/banners/:id/image — изображение баннера
 */
router.get('/banners/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      'SELECT image_data, image_content_type FROM home_banners WHERE id = $1',
      [id]
    );
    if (!r.rows[0] || !r.rows[0].image_data) {
      return res.status(404).json({ message: 'Изображение не найдено' });
    }
    const { image_data, image_content_type } = r.rows[0];
    res.set('Content-Type', image_content_type || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(image_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
