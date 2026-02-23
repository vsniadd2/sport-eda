import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getIO } from '../socket.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, address, phone, payment_method: paymentMethod, card_last4: cardLast4 } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'Корзина пуста' });
    const method = paymentMethod === 'card' ? 'card' : 'on_delivery';
    if (method === 'on_delivery' && (!phone || !String(phone).trim())) {
      return res.status(400).json({ message: 'Укажите телефон для оплаты при получении' });
    }
    if (method === 'card' && (!phone || !String(phone).trim())) {
      return res.status(400).json({ message: 'Укажите телефон для оплаты картой' });
    }
    const last4 = method === 'card' && cardLast4 != null ? String(cardLast4).replace(/\D/g, '').slice(0, 4) : null;
    const paymentStatus = method === 'card' ? 'paid' : 'pending';
    let total = 0;
    const qtyByProduct = {};
    for (const it of items) {
      const p = await pool.query('SELECT price, sale_price, is_sale, name, COALESCE(quantity, 0) AS quantity FROM products WHERE id = $1', [it.product_id]);
      if (!p.rows[0]) return res.status(400).json({ message: `Товар ${it.product_id} не найден` });
      const row = p.rows[0];
      const orderQty = it.quantity || 1;
      const stock = parseInt(row.quantity, 10) || 0;
      if (stock < orderQty) {
        return res.status(400).json({ message: `Недостаточно товара: ${row.name || 'Товар'} (в наличии: ${stock})` });
      }
      qtyByProduct[it.product_id] = (qtyByProduct[it.product_id] || 0) + orderQty;
      const effectivePrice = (row.is_sale && row.sale_price != null) ? parseFloat(row.sale_price) : parseFloat(row.price);
      total += effectivePrice * orderQty;
    }
    const order = await pool.query(
      'INSERT INTO orders (user_id, total, address, phone, payment_method, payment_status, card_last4) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.userId, total, address?.trim() || null, phone?.trim() || null, method, paymentStatus, last4 || null]
    );
    const orderId = order.rows[0].id;
    for (const it of items) {
      const p = await pool.query('SELECT price, sale_price, is_sale, name FROM products WHERE id = $1', [it.product_id]);
      const row = p.rows[0];
      const effectivePrice = (row.is_sale && row.sale_price != null) ? parseFloat(row.sale_price) : parseFloat(row.price);
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, it.product_id, it.quantity || 1, effectivePrice]
      );
    }
    for (const productId of Object.keys(qtyByProduct)) {
      await pool.query('UPDATE products SET quantity = quantity - $1 WHERE id = $2', [qtyByProduct[productId], productId]);
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

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    if (Number.isNaN(orderId)) return res.status(404).json({ message: 'Заказ не найден' });
    const orderRes = await pool.query(
      req.user.role === 'admin' ? 'SELECT o.*, u.email, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = $1' : 'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      req.user.role === 'admin' ? [orderId] : [orderId, req.user.userId]
    );
    if (!orderRes.rows[0]) return res.status(404).json({ message: 'Заказ не найден' });
    const order = orderRes.rows[0];
    const itemsRes = await pool.query(
      'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
      [orderId]
    );
    order.items = itemsRes.rows;
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
