import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const searchTerm = typeof search === 'string' ? search.trim() : '';
    let result;
    let countResult;
    if (searchTerm) {
      const pattern = `%${searchTerm}%`;
      result = await pool.query(
        `SELECT id, email, username, role, created_at FROM users
         WHERE email ILIKE $1 OR username ILIKE $1 OR CAST(id AS TEXT) = $2
         ORDER BY id LIMIT $3 OFFSET $4`,
        [pattern, searchTerm, limitNum, offset]
      );
      countResult = await pool.query(
        'SELECT COUNT(*) FROM users WHERE email ILIKE $1 OR username ILIKE $1 OR CAST(id AS TEXT) = $2',
        [pattern, searchTerm]
      );
    } else {
      result = await pool.query(
        'SELECT id, email, username, role, created_at FROM users ORDER BY id LIMIT $1 OFFSET $2',
        [limitNum, offset]
      );
      countResult = await pool.query('SELECT COUNT(*) FROM users');
    }
    res.json({ users: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/callback-requests', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, created_at FROM callback_requests ORDER BY created_at DESC LIMIT 200'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.email, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 100`
    );
    for (const o of result.rows) {
      const items = await pool.query(
        'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
        [o.id]
      );
      o.items = items.rows;
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ message: 'Название и slug обязательны' });
    const result = await pool.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug.toLowerCase().replace(/\s+/g, '-')]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Категория с таким slug уже существует' });
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { category_id, name, description, weight, price, image_url } = req.body || {};
    if (!category_id || !name || price === undefined) return res.status(400).json({ message: 'Категория, название и цена обязательны' });
    const file = req.file;
    if (file) {
      const result = await pool.query(
        `INSERT INTO products (category_id, name, description, weight, price, image_url, image_data, image_content_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, category_id, name, description, weight, price, image_url, created_at`,
        [category_id, name, description || null, weight || null, parseFloat(price), null, file.buffer, file.mimetype]
      );
      return res.status(201).json(result.rows[0]);
    }
    const result = await pool.query(
      'INSERT INTO products (category_id, name, description, weight, price, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [category_id, name, description || null, weight || null, parseFloat(price), image_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const { name, description, weight, price, image_url } = body;
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description); }
    if (weight !== undefined) { updates.push(`weight = $${i++}`); values.push(weight); }
    if (price !== undefined) { updates.push(`price = $${i++}`); values.push(parseFloat(price)); }
    if (image_url !== undefined) { updates.push(`image_url = $${i++}`); values.push(image_url); }
    if (req.file) {
      updates.push(`image_data = $${i++}`); values.push(req.file.buffer);
      updates.push(`image_content_type = $${i++}`); values.push(req.file.mimetype);
    }
    if (updates.length === 0) return res.status(400).json({ message: 'Нет данных для обновления' });
    values.push(id);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, category_id, name, description, weight, price, image_url, created_at`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Товар не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
