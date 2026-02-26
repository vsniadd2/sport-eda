import { Router } from 'express';
import multer from 'multer';
import { pool } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { getIO } from '../socket.js';

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
    const archive = req.query.archive === '1';
    const completedCondition = archive
      ? 'completed_at IS NOT NULL'
      : 'completed_at IS NULL';
    const result = await pool.query(
      `SELECT id, name, phone, created_at, completed_at FROM callback_requests WHERE ${completedCondition} ORDER BY created_at DESC LIMIT 200`,
      []
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
    const archive = req.query.archive === '1';
    const archiveCondition = archive
      ? `AND o.payment_status = 'paid' AND o.shipped_at IS NOT NULL`
      : `AND (o.payment_status != 'paid' OR o.shipped_at IS NULL)`;
    const result = await pool.query(
      `SELECT o.*, u.email, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE 1=1 ${archiveCondition} ORDER BY o.created_at DESC LIMIT 100`
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

async function loadFullOrder(orderId) {
  const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!orderRes.rows[0]) return null;
  const order = orderRes.rows[0];
  const itemsRes = await pool.query(
    'SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
    [orderId]
  );
  order.items = itemsRes.rows;
  return order;
}

router.patch('/orders/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { paid } = req.body || {};
    const paymentStatus = paid ? 'paid' : 'pending';
    const result = await pool.query(
      `UPDATE orders SET payment_status = $1, paid_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END WHERE id = $3 RETURNING id, payment_status, paid_at`,
      [paymentStatus, !!paid, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Заказ не найден' });
    getIO().emitToAdmin('orderUpdated', result.rows[0]);
    const fullOrder = await loadFullOrder(id);
    if (fullOrder?.user_id) getIO().emitToUser(fullOrder.user_id, 'orderUpdated', fullOrder);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/orders/:id/ship', async (req, res) => {
  try {
    const { id } = req.params;
    const { shipped } = req.body || {};
    const setShipped = shipped !== false;
    const result = await pool.query(
      setShipped
        ? `UPDATE orders SET shipped_at = COALESCE(shipped_at, NOW()) WHERE id = $1 RETURNING id, shipped_at`
        : `UPDATE orders SET shipped_at = NULL WHERE id = $1 RETURNING id, shipped_at`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Заказ не найден' });
    getIO().emitToAdmin('orderUpdated', result.rows[0]);
    const fullOrder = await loadFullOrder(id);
    if (fullOrder?.user_id) getIO().emitToUser(fullOrder.user_id, 'orderUpdated', fullOrder);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/orders/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { processed } = req.body || {};
    const setProcessed = processed === true;
    const result = await pool.query(
      setProcessed
        ? `UPDATE orders SET processed_at = COALESCE(processed_at, NOW()) WHERE id = $1 RETURNING id, processed_at`
        : `UPDATE orders SET processed_at = NULL WHERE id = $1 RETURNING id, processed_at`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Заказ не найден' });
    getIO().emitToAdmin('orderUpdated', result.rows[0]);
    const fullOrder = await loadFullOrder(id);
    if (fullOrder?.user_id) getIO().emitToUser(fullOrder.user_id, 'orderUpdated', fullOrder);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/feedback', async (req, res) => {
  try {
    const ticketsRes = await pool.query(
      `SELECT t.id, t.user_id, t.created_at, u.email, u.username
       FROM feedback_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC LIMIT 200`
    );
    const tickets = ticketsRes.rows;
    for (const t of tickets) {
      const messagesRes = await pool.query(
        'SELECT id, ticket_id, author, body, created_at FROM feedback_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
        [t.id]
      );
      t.messages = messagesRes.rows;
    }
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/feedback/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body || {};
    const bodyTrim = typeof body === 'string' ? body.trim() : '';
    if (!bodyTrim) return res.status(400).json({ message: 'Укажите текст ответа' });
    const ticketRow = await pool.query('SELECT id, user_id FROM feedback_tickets WHERE id = $1', [id]);
    if (!ticketRow.rows[0]) return res.status(404).json({ message: 'Тикет не найден' });
    const ticketUserId = ticketRow.rows[0].user_id;
    const msgRes = await pool.query(
      'INSERT INTO feedback_messages (ticket_id, author, body) VALUES ($1, $2, $3) RETURNING id, ticket_id, author, body, created_at',
      [id, 'admin', bodyTrim]
    );
    const newMsg = msgRes.rows[0];
    getIO().emitToUser(ticketUserId, 'feedbackSupportReplied', { ticketId: parseInt(id, 10), message: newMsg });
    res.status(201).json(newMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM feedback_tickets WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Тикет не найден' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const result = await pool.query(
      `SELECT r.id, r.user_id, r.product_id, r.rating, r.text, r.created_at, r.admin_reply, r.admin_replied_at,
              u.username, p.name AS product_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/reviews/:id/reply', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id, 10);
    if (Number.isNaN(reviewId)) {
      return res.status(400).json({ message: 'Неверный ID отзыва' });
    }
    const { reply } = req.body || {};
    const replyText = typeof reply === 'string' ? reply.trim() : null;
    const result = await pool.query(
      `UPDATE reviews SET admin_reply = $1::text, admin_replied_at = CASE WHEN $1::text IS NOT NULL AND trim(COALESCE($1::text, '')) <> '' THEN NOW() ELSE NULL END WHERE id = $2 RETURNING id, admin_reply, admin_replied_at`,
      [replyText ?? null, reviewId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Отзыв не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /admin/reviews/:id/reply error:', err.message || err);
    if (err.code === '42703') {
      return res.status(500).json({ message: 'Колонки для ответа админа не найдены. Запустите миграции: npm run migrate' });
    }
    res.status(500).json({ message: err.message || 'Ошибка сервера' });
  }
});

router.get('/visits', async (req, res) => {
  try {
    const [visitsByDayRes, todayRes] = await Promise.all([
      pool.query(`
        SELECT TO_CHAR(visit_date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
        FROM site_visits
        WHERE visit_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY visit_date
        ORDER BY visit_date
      `),
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM site_visits WHERE visit_date = CURRENT_DATE) AS today_count,
          TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS server_date
      `),
    ]);
    const todayRow = todayRes.rows[0] || {};
    res.json({
      visitsByDay: visitsByDayRes.rows,
      todayCount: Number(todayRow.today_count) || 0,
      serverDate: todayRow.server_date || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const year = req.query.year != null ? parseInt(req.query.year, 10) : null;
    const month = req.query.month != null ? parseInt(req.query.month, 10) : null;
    const useMonth = year != null && !Number.isNaN(year) && month != null && !Number.isNaN(month) && month >= 1 && month <= 12;
    const monthStart = useMonth ? `${year}-${String(month).padStart(2, '0')}-01` : null;

    const dateFilter = useMonth && monthStart
      ? `o.created_at >= $1::date AND o.created_at < $1::date + INTERVAL '1 month'`
      : `o.created_at >= NOW() - INTERVAL '30 days'`;
    const params = useMonth && monthStart ? [monthStart] : [];

    const summary = await pool.query(
      `SELECT
        COALESCE(SUM(o.total), 0)::float AS total_revenue_30,
        COUNT(o.id)::int AS total_orders_30,
        CASE WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total), 0) / COUNT(o.id) ELSE 0 END::float AS average_check_30
      FROM orders o
      WHERE ${dateFilter}`,
      params
    );
    const salesByDay = await pool.query(
      `SELECT TO_CHAR(DATE(o.created_at), 'YYYY-MM-DD') AS date, COUNT(o.id)::int AS orders_count, COALESCE(SUM(o.total), 0)::float AS total
      FROM orders o
      WHERE ${dateFilter}
      GROUP BY DATE(o.created_at)
      ORDER BY date`,
      params
    );
    const byCategory = useMonth && monthStart
      ? await pool.query(
          `SELECT c.id, c.name, COALESCE(SUM(oi.quantity * oi.price), 0)::float AS total, COALESCE(SUM(oi.quantity), 0)::int AS quantity
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
          LEFT JOIN order_items oi ON oi.product_id = p.id
          LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= $1::date AND o.created_at < $1::date + INTERVAL '1 month'
          GROUP BY c.id, c.name
          ORDER BY total DESC`,
          [monthStart]
        )
      : await pool.query(`
          SELECT c.id, c.name, COALESCE(SUM(oi.quantity * oi.price), 0)::float AS total, COALESCE(SUM(oi.quantity), 0)::int AS quantity
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
          LEFT JOIN order_items oi ON oi.product_id = p.id
          LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= NOW() - INTERVAL '30 days'
          GROUP BY c.id, c.name
          ORDER BY total DESC
        `);
    const byProduct = useMonth && monthStart
      ? await pool.query(
          `SELECT p.id, p.name, COALESCE(SUM(oi.quantity), 0)::int AS quantity, COALESCE(SUM(oi.quantity * oi.price), 0)::float AS total
          FROM products p
          LEFT JOIN order_items oi ON oi.product_id = p.id
          LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= $1::date AND o.created_at < $1::date + INTERVAL '1 month'
          GROUP BY p.id, p.name
          HAVING COALESCE(SUM(oi.quantity), 0) > 0
          ORDER BY total DESC
          LIMIT 20`,
          [monthStart]
        )
      : await pool.query(`
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
      period: useMonth && monthStart ? { year, month } : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, slug, parent_id: parentIdParam, sort_order: sortOrderParam } = req.body;
    if (!name || !slug) return res.status(400).json({ message: 'Название и slug обязательны' });
    const slugVal = String(slug).trim().toLowerCase().replace(/\s+/g, '-') || 'category';
    const parentId = parentIdParam !== undefined && parentIdParam !== '' && parentIdParam != null
      ? (Number.isNaN(parseInt(parentIdParam, 10)) ? null : parseInt(parentIdParam, 10))
      : null;
    const sortOrder = sortOrderParam !== undefined && sortOrderParam !== '' && !Number.isNaN(parseInt(sortOrderParam, 10))
      ? parseInt(sortOrderParam, 10)
      : 0;
    const result = await pool.query(
      'INSERT INTO categories (name, slug, parent_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, slugVal, parentId, sortOrder]
    );
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Категория с таким slug уже существует' });
    if (err.code === '23503') return res.status(400).json({ message: 'Родительская категория не найдена' });
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/categories/reorder', async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Ожидается массив { id, sort_order }[]' });
    }
    for (const item of items) {
      const id = parseInt(item.id, 10);
      const sort_order = parseInt(item.sort_order, 10);
      if (Number.isNaN(id) || Number.isNaN(sort_order)) continue;
      await pool.query('UPDATE categories SET sort_order = $1 WHERE id = $2', [sort_order, id]);
    }
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Неверный ID' });
    const { name, slug, parent_id: parentIdParam, sort_order: sortOrderParam } = req.body || {};
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
    if (slug !== undefined) { updates.push(`slug = $${i++}`); values.push(String(slug).trim().toLowerCase().replace(/\s+/g, '-')); }
    if (sortOrderParam !== undefined && sortOrderParam !== '' && !Number.isNaN(parseInt(sortOrderParam, 10))) {
      updates.push(`sort_order = $${i++}`);
      values.push(parseInt(sortOrderParam, 10));
    }
    if (parentIdParam !== undefined) {
      const parentId = parentIdParam === '' || parentIdParam == null ? null : parseInt(parentIdParam, 10);
      if (parentId !== null && (Number.isNaN(parentId) || parentId === id)) {
        return res.status(400).json({ message: 'Родителем не может быть эта же категория' });
      }
      if (parentId !== null) {
        const cycleCheck = await pool.query(
          `WITH RECURSIVE descendants AS (
            SELECT id FROM categories WHERE parent_id = $1
            UNION ALL
            SELECT c.id FROM categories c JOIN descendants d ON c.parent_id = d.id
          ) SELECT 1 FROM descendants WHERE id = $2`,
          [id, parentId]
        );
        if (cycleCheck.rows.length > 0) return res.status(400).json({ message: 'Нельзя сделать подкатегорию родителем (цикл)' });
      }
      updates.push(`parent_id = $${i++}`);
      values.push(parentId);
    }
    if (updates.length === 0) return res.status(400).json({ message: 'Нет данных для обновления' });
    values.push(id);
    const result = await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Категория не найдена' });
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Категория с таким slug уже существует' });
    if (err.code === '23503') return res.status(400).json({ message: 'Родительская категория не найдена' });
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hasChildren = await pool.query('SELECT 1 FROM categories WHERE parent_id = $1 LIMIT 1', [id]);
    if (hasChildren.rows.length > 0) {
      return res.status(400).json({ message: 'Нельзя удалить категорию: в ней есть подкатегории. Сначала удалите или перенесите подкатегории.' });
    }
    const hasProducts = await pool.query('SELECT 1 FROM products WHERE category_id = $1 LIMIT 1', [id]);
    if (hasProducts.rows.length > 0) {
      return res.status(400).json({ message: 'Нельзя удалить категорию: в ней есть товары. Сначала удалите или перенесите товары.' });
    }
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Категория не найдена' });
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Загрузка изображения категории
router.put('/categories/:id/image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'Изображение не загружено' });
    }
    const result = await pool.query(
      `UPDATE categories SET image_data = $1, image_content_type = $2 WHERE id = $3 RETURNING id, name, slug`,
      [req.file.buffer, req.file.mimetype, id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
    res.json({ ...result.rows[0], has_image: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удаление изображения категории
router.delete('/categories/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE categories SET image_data = NULL, image_content_type = NULL WHERE id = $1 RETURNING id, name, slug`,
      [id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
    res.json({ ...result.rows[0], has_image: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

const parseBool = (v) => v === true || v === 'true' || v === '1';

/** Список товаров с настройками страницы для админки */
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.category_id, p.name, p.description, p.weight, p.price, p.sale_price, p.image_url, p.article, p.manufacturer,
        p.country, p.servings, p.flavors,
        (p.image_data IS NOT NULL OR (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) > 0) AS has_image,
        (SELECT COUNT(*)::int FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
        COALESCE(p.in_stock, true) AS in_stock, COALESCE(p.quantity, 0)::int AS quantity,
        COALESCE(p.is_sale, false) AS is_sale, COALESCE(p.is_hit, false) AS is_hit, COALESCE(p.is_recommended, false) AS is_recommended,
        p.short_description, p.trust_badges, p.how_to_use_intro, p.how_to_use_step1, p.how_to_use_step2, p.how_to_use_step3,
        COALESCE(p.show_how_to_use, true) AS show_how_to_use, COALESCE(p.show_related, true) AS show_related
      FROM products p
      ORDER BY p.category_id, p.id
    `);
    const rows = result.rows.map((r) => {
      const row = { ...r };
      if (row.trust_badges && typeof row.trust_badges === 'string') {
        try {
          row.trust_badges = JSON.parse(row.trust_badges);
        } catch {
          row.trust_badges = null;
        }
      }
      if (!Array.isArray(row.trust_badges)) row.trust_badges = null;
      return row;
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

const productImageFields = [
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
];

router.post('/products', upload.fields(productImageFields), async (req, res) => {
  try {
    const { category_id, name, description, short_description, weight, price, sale_price, image_url, is_sale, is_hit, is_recommended, in_stock, quantity, article, manufacturer, country, servings, flavors } = req.body || {};
    if (!category_id || !name || price === undefined) return res.status(400).json({ message: 'Категория, название и цена обязательны' });
    const sale = parseBool(is_sale);
    const hit = parseBool(is_hit);
    const rec = parseBool(is_recommended);
    const inStock = in_stock === undefined ? true : parseBool(in_stock);
    const qty = quantity !== undefined && quantity !== '' ? Math.max(0, parseInt(quantity, 10) || 0) : 0;
    const salePriceVal = sale_price !== undefined && sale_price !== '' ? parseFloat(sale_price) : null;
    const shortDescVal = short_description !== undefined && short_description !== '' ? String(short_description).trim() : null;
    const articleVal = article !== undefined && article !== '' && !Number.isNaN(parseInt(article, 10)) ? parseInt(article, 10) : null;
    const manufacturerVal = manufacturer !== undefined && String(manufacturer).trim() !== '' ? String(manufacturer).trim() : null;
    const countryVal = country !== undefined && String(country).trim() !== '' ? String(country).trim() : null;
    const servingsVal = servings !== undefined && servings !== '' && !Number.isNaN(parseInt(servings, 10)) ? parseInt(servings, 10) : null;
    const flavorsVal = (() => {
      if (flavors === undefined || flavors === null) return null;
      if (Array.isArray(flavors)) return JSON.stringify(flavors);
      const s = String(flavors).trim();
      if (!s) return null;
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? JSON.stringify(parsed) : null;
      } catch {
        const arr = s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
        return arr.length ? JSON.stringify(arr) : null;
      }
    })();
    const result = await pool.query(
      `INSERT INTO products (category_id, name, description, short_description, weight, price, sale_price, image_url, is_sale, is_hit, is_recommended, in_stock, quantity, article, manufacturer, country, servings, flavors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id, category_id, name, description, short_description, weight, price, sale_price, image_url, created_at`,
      [category_id, name, description || null, shortDescVal, weight || null, parseFloat(price), salePriceVal, image_url || null, sale, hit, rec, inStock, qty, articleVal, manufacturerVal, countryVal, servingsVal, flavorsVal]
    );
    const productId = result.rows[0].id;
    const files = req.files?.images?.length ? req.files.images : (req.files?.image?.length ? req.files.image : []);
    for (let i = 0; i < Math.min(files.length, 10); i++) {
      const file = files[i];
      if (file?.buffer) {
        await pool.query(
          'INSERT INTO product_images (product_id, sort_order, image_data, image_content_type) VALUES ($1, $2, $3, $4)',
          [productId, i, file.buffer, file.mimetype]
        );
      }
    }
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/products/:id', upload.fields(productImageFields), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const {
      name, description, weight, price, sale_price, image_url, category_id, is_sale, is_hit, is_recommended, in_stock, quantity,
      short_description, trust_badges, how_to_use_intro, how_to_use_step1, how_to_use_step2, how_to_use_step3, show_how_to_use, show_related,
      article, manufacturer, country, servings, flavors,
    } = body;
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description === '' ? null : description); }
    if (weight !== undefined) { updates.push(`weight = $${i++}`); values.push(weight); }
    if (price !== undefined) { updates.push(`price = $${i++}`); values.push(parseFloat(price)); }
    if (sale_price !== undefined) { updates.push(`sale_price = $${i++}`); values.push(sale_price === '' || sale_price == null ? null : parseFloat(sale_price)); }
    if (image_url !== undefined) { updates.push(`image_url = $${i++}`); values.push(image_url); }
    if (category_id !== undefined) { updates.push(`category_id = $${i++}`); values.push(category_id); }
    if (is_sale !== undefined) { updates.push(`is_sale = $${i++}`); values.push(parseBool(is_sale)); }
    if (is_hit !== undefined) { updates.push(`is_hit = $${i++}`); values.push(parseBool(is_hit)); }
    if (is_recommended !== undefined) { updates.push(`is_recommended = $${i++}`); values.push(parseBool(is_recommended)); }
    if (in_stock !== undefined) { updates.push(`in_stock = $${i++}`); values.push(parseBool(in_stock)); }
    if (quantity !== undefined && quantity !== '') { updates.push(`quantity = $${i++}`); values.push(Math.max(0, parseInt(quantity, 10) || 0)); }
    if (short_description !== undefined) { updates.push(`short_description = $${i++}`); values.push(short_description === '' ? null : short_description); }
    if (trust_badges !== undefined) {
      const val = typeof trust_badges === 'string' ? trust_badges : (Array.isArray(trust_badges) ? JSON.stringify(trust_badges) : null);
      updates.push(`trust_badges = $${i++}`);
      values.push(val === '' ? null : val);
    }
    if (how_to_use_intro !== undefined) { updates.push(`how_to_use_intro = $${i++}`); values.push(how_to_use_intro === '' ? null : how_to_use_intro); }
    if (how_to_use_step1 !== undefined) { updates.push(`how_to_use_step1 = $${i++}`); values.push(how_to_use_step1 === '' ? null : how_to_use_step1); }
    if (how_to_use_step2 !== undefined) { updates.push(`how_to_use_step2 = $${i++}`); values.push(how_to_use_step2 === '' ? null : how_to_use_step2); }
    if (how_to_use_step3 !== undefined) { updates.push(`how_to_use_step3 = $${i++}`); values.push(how_to_use_step3 === '' ? null : how_to_use_step3); }
    if (show_how_to_use !== undefined) { updates.push(`show_how_to_use = $${i++}`); values.push(parseBool(show_how_to_use)); }
    if (show_related !== undefined) { updates.push(`show_related = $${i++}`); values.push(parseBool(show_related)); }
    if (article !== undefined) {
      const articleVal = article === '' || article == null ? null : (Number.isNaN(parseInt(article, 10)) ? null : parseInt(article, 10));
      updates.push(`article = $${i++}`);
      values.push(articleVal);
    }
    if (manufacturer !== undefined) {
      updates.push(`manufacturer = $${i++}`);
      values.push(typeof manufacturer === 'string' && manufacturer.trim() !== '' ? manufacturer.trim() : null);
    }
    if (country !== undefined) {
      updates.push(`country = $${i++}`);
      values.push(typeof country === 'string' && country.trim() !== '' ? country.trim() : null);
    }
    if (servings !== undefined && servings !== '') {
      const servingsVal = Number.isNaN(parseInt(servings, 10)) ? null : parseInt(servings, 10);
      updates.push(`servings = $${i++}`);
      values.push(servingsVal);
    }
    if (flavors !== undefined) {
      const flavorsVal = (() => {
        if (flavors === null || flavors === '') return null;
        if (Array.isArray(flavors)) return JSON.stringify(flavors);
        const s = String(flavors).trim();
        if (!s) return null;
        try {
          const parsed = JSON.parse(s);
          return Array.isArray(parsed) ? JSON.stringify(parsed) : null;
        } catch {
          const arr = s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
          return arr.length ? JSON.stringify(arr) : null;
        }
      })();
      updates.push(`flavors = $${i++}`);
      values.push(flavorsVal);
    }
    if (updates.length === 0 && !req.files?.images?.length && !req.files?.image?.length) return res.status(400).json({ message: 'Нет данных для обновления' });
    if (updates.length > 0) {
      values.push(id);
      await pool.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = $${i}`,
        values
      );
    }
    const files = req.files?.images?.length ? req.files.images : (req.files?.image?.length ? req.files.image : []);
    if (files.length > 0) {
      await pool.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      for (let j = 0; j < Math.min(files.length, 10); j++) {
        const file = files[j];
        if (file?.buffer) {
          await pool.query(
            'INSERT INTO product_images (product_id, sort_order, image_data, image_content_type) VALUES ($1, $2, $3, $4)',
            [id, j, file.buffer, file.mimetype]
          );
        }
      }
    }
    const result = await pool.query(
      `SELECT p.id, p.category_id, p.name, p.description, p.weight, p.price, p.sale_price, p.image_url, p.created_at,
              (p.image_data IS NOT NULL OR (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) > 0) AS has_image,
              (SELECT COUNT(*)::int FROM product_images pi WHERE pi.product_id = p.id) AS image_count
       FROM products p WHERE p.id = $1`,
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Товар не найден' });
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
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
    getIO().emitToAdmin('catalogChanged');
    getIO().emitToAll('productsChanged');
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ——— Баннеры главной ———
router.get('/banners', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sort_order, link_url, title, (image_data IS NOT NULL) AS has_image
       FROM home_banners ORDER BY sort_order ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/banners', upload.single('image'), async (req, res) => {
  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS cnt FROM home_banners');
    if ((countResult.rows[0]?.cnt ?? 0) >= 5) {
      return res.status(400).json({ message: 'Максимум 5 баннеров' });
    }
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Загрузите изображение' });
    }
    const linkUrl = (req.body.link_url || '').trim() || null;
    const title = (req.body.title || '').trim() || null;
    const sortOrder = parseInt(req.body.sort_order, 10);
    const order = Number.isNaN(sortOrder) ? 0 : sortOrder;
    const result = await pool.query(
      `INSERT INTO home_banners (sort_order, image_data, image_content_type, link_url, title)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sort_order, link_url, title, (image_data IS NOT NULL) AS has_image`,
      [order, req.file.buffer, req.file.mimetype || 'image/jpeg', linkUrl, title]
    );
    getIO().emitToAll('homeBannersChanged');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/banners/:id', upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Неверный ID' });
    const linkUrl = req.body.link_url !== undefined ? (req.body.link_url || '').trim() || null : undefined;
    const title = req.body.title !== undefined ? (req.body.title || '').trim() || null : undefined;
    const sortOrderParam = req.body.sort_order;
    const sortOrder = sortOrderParam !== undefined ? (Number.isNaN(parseInt(sortOrderParam, 10)) ? undefined : parseInt(sortOrderParam, 10)) : undefined;

    const updates = [];
    const values = [];
    let i = 1;
    if (req.file && req.file.buffer) {
      updates.push(`image_data = $${i++}`, `image_content_type = $${i++}`);
      values.push(req.file.buffer, req.file.mimetype || 'image/jpeg');
    }
    if (linkUrl !== undefined) {
      updates.push(`link_url = $${i++}`);
      values.push(linkUrl);
    }
    if (title !== undefined) {
      updates.push(`title = $${i++}`);
      values.push(title);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${i++}`);
      values.push(sortOrder);
    }
    if (updates.length === 0) {
      const r = await pool.query(
        `SELECT id, sort_order, link_url, title, (image_data IS NOT NULL) AS has_image FROM home_banners WHERE id = $1`,
        [id]
      );
      if (!r.rows[0]) return res.status(404).json({ message: 'Баннер не найден' });
      return res.json(r.rows[0]);
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE home_banners SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, sort_order, link_url, title, (image_data IS NOT NULL) AS has_image`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Баннер не найден' });
    getIO().emitToAll('homeBannersChanged');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/banners/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Неверный ID' });
    const result = await pool.query('DELETE FROM home_banners WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Баннер не найден' });
    getIO().emitToAll('homeBannersChanged');
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// ——— Бренды (страница «Бренды» / О магазине) ———
router.get('/brands', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sort_order, name, description, (image_data IS NOT NULL) AS has_image
       FROM brands ORDER BY sort_order ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/brands', upload.single('image'), async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Укажите название бренда' });
    const description = (req.body.description || '').trim() || null;
    const countResult = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM brands');
    const sortOrder = countResult.rows[0]?.next_order ?? 0;
    const imageBuffer = req.file?.buffer ?? null;
    const imageContentType = req.file?.mimetype || (imageBuffer ? 'image/jpeg' : null);
    const result = await pool.query(
      `INSERT INTO brands (sort_order, name, description, image_data, image_content_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sort_order, name, description, (image_data IS NOT NULL) AS has_image`,
      [sortOrder, name, description, imageBuffer, imageContentType]
    );
    getIO().emitToAll('brandsChanged');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/brands/:id', upload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Неверный ID' });
    const name = req.body.name !== undefined ? (req.body.name || '').trim() : undefined;
    const description = req.body.description !== undefined ? ((req.body.description || '').trim() || null) : undefined;
    const sortOrderParam = req.body.sort_order;
    const sortOrder = sortOrderParam !== undefined ? (Number.isNaN(parseInt(sortOrderParam, 10)) ? undefined : parseInt(sortOrderParam, 10)) : undefined;
    if (name !== undefined && !name) return res.status(400).json({ message: 'Название не может быть пустым' });

    const updates = [];
    const values = [];
    let i = 1;
    if (req.file && req.file.buffer) {
      updates.push('image_data = $' + i++, 'image_content_type = $' + i++);
      values.push(req.file.buffer, req.file.mimetype || 'image/jpeg');
    }
    if (name !== undefined) {
      updates.push('name = $' + i++);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = $' + i++);
      values.push(description);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = $' + i++);
      values.push(sortOrder);
    }
    if (updates.length === 0) {
      const r = await pool.query(
        `SELECT id, sort_order, name, description, (image_data IS NOT NULL) AS has_image FROM brands WHERE id = $1`,
        [id]
      );
      if (!r.rows[0]) return res.status(404).json({ message: 'Бренд не найден' });
      return res.json(r.rows[0]);
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE brands SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, sort_order, name, description, (image_data IS NOT NULL) AS has_image`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Бренд не найден' });
    getIO().emitToAll('brandsChanged');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/brands/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Неверный ID' });
    const result = await pool.query('DELETE FROM brands WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Бренд не найден' });
    getIO().emitToAll('brandsChanged');
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
