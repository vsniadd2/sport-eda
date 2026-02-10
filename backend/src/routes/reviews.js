import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 50',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/product/:id/can-review', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const bought = await pool.query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = $1 AND oi.product_id = $2 LIMIT 1`,
      [req.user.userId, id]
    );
    const existing = await pool.query(
      'SELECT id, rating, text, created_at FROM reviews WHERE user_id = $1 AND product_id = $2 LIMIT 1',
      [req.user.userId, id]
    );
    const review = existing.rows[0] || null;
    res.json({ canReview: bought.rows.length > 0, hasReview: !!review, review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/product/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Рейтинг от 1 до 5' });
    }
    const exists = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (!exists.rows[0]) return res.status(404).json({ message: 'Товар не найден' });
    const bought = await pool.query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = $1 AND oi.product_id = $2 LIMIT 1`,
      [req.user.userId, id]
    );
    if (bought.rows.length === 0) {
      return res.status(403).json({ message: 'Оставить отзыв могут только покупатели этого товара' });
    }
    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, text) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id) DO UPDATE SET rating = $3, text = $4, created_at = NOW()
       RETURNING *`,
      [req.user.userId, id, rating, text || null]
    );
    if (!result.rows[0]) return res.status(400).json({ message: 'Ошибка сохранения отзыва' });
    const review = result.rows[0];
    const user = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.userId]);
    res.status(201).json({ ...review, username: user.rows[0]?.username });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Вы уже оставили отзыв' });
    if (err.constraint === 'idx_reviews_user_product') return res.status(400).json({ message: 'Вы уже оставили отзыв' });
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/product/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      'DELETE FROM reviews WHERE user_id = $1 AND product_id = $2 RETURNING id',
      [req.user.userId, productId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Отзыв не найден' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
