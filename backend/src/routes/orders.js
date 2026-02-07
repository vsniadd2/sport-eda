import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getIO } from '../socket.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, address, phone } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'Корзина пуста' });
    let total = 0;
    for (const it of items) {
      const p = await pool.query('SELECT price FROM products WHERE id = $1', [it.product_id]);
      if (!p.rows[0]) return res.status(400).json({ message: `Товар ${it.product_id} не найден` });
      total += parseFloat(p.rows[0].price) * (it.quantity || 1);
    }
    const order = await pool.query(
      'INSERT INTO orders (user_id, total, address, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, total, address || null, phone || null]
    );
    const orderId = order.rows[0].id;
    for (const it of items) {
      const p = await pool.query('SELECT price, name FROM products WHERE id = $1', [it.product_id]);
      const price = parseFloat(p.rows[0].price);
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, it.product_id, it.quantity || 1, price]
      );
    }
    const orderData = order.rows[0];
    getIO().emitToAdmin('newOrder', orderData);
    res.status(201).json(orderData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const q = isAdmin
      ? 'SELECT o.*, u.email, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 100'
      : 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50';
    const params = isAdmin ? [] : [req.user.userId];
    const orders = await pool.query(q, params);
    for (const o of orders.rows) {
      const items = await pool.query(
        'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
        [o.id]
      );
      o.items = items.rows;
    }
    res.json(orders.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
