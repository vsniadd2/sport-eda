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
        `SELECT u.id, u.email, u.username, u.role, u.created_at, u.first_name, u.last_name, u.patronymic,
         COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id), 0)::float AS total_spent
         FROM users u
         WHERE u.email ILIKE $1 OR u.username ILIKE $1 OR CAST(u.id AS TEXT) = $2
         ORDER BY u.id LIMIT $3 OFFSET $4`,
        [pattern, searchTerm, limitNum, offset]
      );
      countResult = await pool.query(
        'SELECT COUNT(*) FROM users WHERE email ILIKE $1 OR username ILIKE $1 OR CAST(id AS TEXT) = $2',
        [pattern, searchTerm]
      );
    } else {
      result = await pool.query(
        `SELECT u.id, u.email, u.username, u.role, u.created_at, u.first_name, u.last_name, u.patronymic,
         COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id), 0)::float AS total_spent
         FROM users u ORDER BY u.id LIMIT $1 OFFSET $2`,
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

router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, username, role, created_at, first_name, last_name, patronymic FROM users WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, role, first_name, last_name, patronymic } = req.body || {};
    const updates = [];
    const values = [];
    let i = 1;
    if (email !== undefined) { updates.push(`email = $${i++}`); values.push(email === '' || email == null ? null : String(email).trim()); }
    if (username !== undefined) { updates.push(`username = $${i++}`); values.push(username === '' ? null : String(username).trim()); }
    if (role !== undefined) { updates.push(`role = $${i++}`); values.push(role === 'admin' ? 'admin' : 'user'); }
    if (first_name !== undefined) { updates.push(`first_name = $${i++}`); values.push(first_name === '' ? null : String(first_name).trim()); }
    if (last_name !== undefined) { updates.push(`last_name = $${i++}`); values.push(last_name === '' ? null : String(last_name).trim()); }
    if (patronymic !== undefined) { updates.push(`patronymic = $${i++}`); values.push(patronymic === '' ? null : String(patronymic).trim()); }
    if (updates.length === 0) return res.status(400).json({ message: 'Нет данных для обновления' });
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, username, role, created_at, first_name, last_name, patronymic`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Email уже занят' });
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await pool.query('SELECT id FROM orders WHERE user_id = $1', [id]);
    if (orders.rows.length > 0) {
      return res.status(400).json({ message: 'Нельзя удалить пользователя с заказами' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Пользователь не найден' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/callback-requests', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM callback_requests WHERE completed_at IS NOT NULL AND completed_at < NOW() - INTERVAL '24 hours'`
    );
    const result = await pool.query(
      `SELECT id, name, phone, created_at, completed_at FROM callback_requests WHERE completed_at IS NULL ORDER BY created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/callback-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE callback_requests SET completed_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, phone, created_at, completed_at`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Заявка не найдена' });
    res.json(result.rows[0]);
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

router.get('/stats', async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT
        COALESCE(SUM(o.total), 0)::float AS total_revenue_30,
        COUNT(o.id)::int AS total_orders_30,
        CASE WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total), 0) / COUNT(o.id) ELSE 0 END::float AS average_check_30
      FROM orders o
      WHERE o.created_at >= NOW() - INTERVAL '30 days'
    `);
    const salesByDay = await pool.query(`
      SELECT DATE(o.created_at) AS date, COUNT(o.id)::int AS orders_count, COALESCE(SUM(o.total), 0)::float AS total
      FROM orders o
      WHERE o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(o.created_at)
      ORDER BY date
    `);
    const byCategory = await pool.query(`
      SELECT c.id, c.name, COALESCE(SUM(oi.quantity * oi.price), 0)::float AS total, SUM(oi.quantity)::int AS quantity
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY c.id, c.name
      ORDER BY total DESC
    `);
    const byProduct = await pool.query(`
      SELECT p.id, p.name, COALESCE(SUM(oi.quantity), 0)::int AS quantity, COALESCE(SUM(oi.quantity * oi.price), 0)::float AS total
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.name
      HAVING COALESCE(SUM(oi.quantity), 0) > 0
      ORDER BY total DESC
      LIMIT 20
    `);
    const row = summary.rows[0] || {};
    res.json({
      summary: {
        totalRevenue: Number(row.total_revenue_30) || 0,
        totalOrders: Number(row.total_orders_30) || 0,
        averageCheck: Number(row.average_check_30) || 0,
      },
      salesByDay: salesByDay.rows,
      byCategory: byCategory.rows,
      byProduct: byProduct.rows,
    });
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

router.patch('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body || {};
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
    if (slug !== undefined) { updates.push(`slug = $${i++}`); values.push(slug.toLowerCase().replace(/\s+/g, '-')); }
    if (updates.length === 0) return res.status(400).json({ message: 'Нет данных для обновления' });
    values.push(id);
    const result = await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Категория не найдена' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Категория с таким slug уже существует' });
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hasProducts = await pool.query('SELECT 1 FROM products WHERE category_id = $1 LIMIT 1', [id]);
    if (hasProducts.rows.length > 0) {
      return res.status(400).json({ message: 'Нельзя удалить категорию: в ней есть товары. Сначала удалите или перенесите товары.' });
    }
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Категория не найдена' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

const parseBool = (v) => v === true || v === 'true' || v === '1';

router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { category_id, name, description, weight, price, image_url, is_sale, is_hit, is_recommended } = req.body || {};
    if (!category_id || !name || price === undefined) return res.status(400).json({ message: 'Категория, название и цена обязательны' });
    const sale = parseBool(is_sale);
    const hit = parseBool(is_hit);
    const rec = parseBool(is_recommended);
    const file = req.file;
    if (file) {
      const result = await pool.query(
        `INSERT INTO products (category_id, name, description, weight, price, image_url, image_data, image_content_type, is_sale, is_hit, is_recommended)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, category_id, name, description, weight, price, image_url, created_at`,
        [category_id, name, description || null, weight || null, parseFloat(price), null, file.buffer, file.mimetype, sale, hit, rec]
      );
      return res.status(201).json(result.rows[0]);
    }
    const result = await pool.query(
      `INSERT INTO products (category_id, name, description, weight, price, image_url, is_sale, is_hit, is_recommended)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [category_id, name, description || null, weight || null, parseFloat(price), image_url || null, sale, hit, rec]
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
    const { name, description, weight, price, image_url, category_id, is_sale, is_hit, is_recommended } = body;
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description); }
    if (weight !== undefined) { updates.push(`weight = $${i++}`); values.push(weight); }
    if (price !== undefined) { updates.push(`price = $${i++}`); values.push(parseFloat(price)); }
    if (image_url !== undefined) { updates.push(`image_url = $${i++}`); values.push(image_url); }
    if (category_id !== undefined) { updates.push(`category_id = $${i++}`); values.push(category_id); }
    if (is_sale !== undefined) { updates.push(`is_sale = $${i++}`); values.push(parseBool(is_sale)); }
    if (is_hit !== undefined) { updates.push(`is_hit = $${i++}`); values.push(parseBool(is_hit)); }
    if (is_recommended !== undefined) { updates.push(`is_recommended = $${i++}`); values.push(parseBool(is_recommended)); }
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

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const inOrders = await pool.query('SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1', [id]);
    if (inOrders.rows.length > 0) {
      return res.status(400).json({ message: 'Нельзя удалить товар: он участвует в заказах.' });
    }
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Товар не найден' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
