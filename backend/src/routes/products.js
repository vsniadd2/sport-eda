import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category: categorySlug, search: searchTerm, ids: idsParam } = req.query;
    let query = `
      SELECT p.id, p.name, p.description, p.weight, p.price, p.image_url, p.article, p.manufacturer,
             (p.image_data IS NOT NULL) AS has_image,
             COALESCE(p.in_stock, true) AS in_stock,
             c.id as category_id, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;
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
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(term);
      paramIndex += 1;
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY c.id, p.id';
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
      'SELECT id, name, slug FROM categories ORDER BY id'
    );
    res.json(result.rows);
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
      `SELECT p.id, p.category_id, p.name, p.description, p.weight, p.price, p.image_url, p.article, p.manufacturer,
              (p.image_data IS NOT NULL) AS has_image,
              COALESCE(p.in_stock, true) AS in_stock,
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
