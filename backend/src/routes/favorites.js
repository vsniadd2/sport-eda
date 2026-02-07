import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT product_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows.map((r) => r.product_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { product_id } = req.body || {};
    const productId = parseInt(product_id, 10);
    if (!productId) return res.status(400).json({ message: 'Укажите product_id' });
    await pool.query(
      'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING',
      [req.user.userId, productId]
    );
    res.status(201).json({ product_id: productId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/:productId', authMiddleware, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ message: 'Некорректный ID' });
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2',
      [req.user.userId, productId]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
