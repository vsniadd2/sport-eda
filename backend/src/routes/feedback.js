import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getIO } from '../socket.js';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
  try {
    const { body } = req.body || {};
    const bodyTrim = typeof body === 'string' ? body.trim() : '';
    if (!bodyTrim) {
      return res.status(400).json({ message: 'Укажите текст сообщения' });
    }
    const userId = req.user.userId;
    const existing = await pool.query('SELECT 1 FROM feedback_tickets WHERE user_id = $1 LIMIT 1', [userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: 'У вас уже есть обращение. Дождитесь ответа поддержки или продолжите диалог в существующем тикете.',
      });
    }
    const ticketRes = await pool.query(
      'INSERT INTO feedback_tickets (user_id) VALUES ($1) RETURNING id, user_id, created_at',
      [userId]
    );
    const ticket = ticketRes.rows[0];
    await pool.query(
      'INSERT INTO feedback_messages (ticket_id, author, body) VALUES ($1, $2, $3)',
      [ticket.id, 'user', bodyTrim]
    );
    const messagesRes = await pool.query(
      'SELECT id, ticket_id, author, body, created_at FROM feedback_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
      [ticket.id]
    );
    const result = { ...ticket, messages: messagesRes.rows };
    getIO().emitToAdmin('feedbackNewTicket', { ticketId: ticket.id });
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const ticketsRes = await pool.query(
      'SELECT id, user_id, created_at FROM feedback_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [userId]
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

router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body || {};
    const bodyTrim = typeof body === 'string' ? body.trim() : '';
    if (!bodyTrim) {
      return res.status(400).json({ message: 'Укажите текст сообщения' });
    }
    const userId = req.user.userId;
    const ticketRes = await pool.query(
      'SELECT id FROM feedback_tickets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (!ticketRes.rows[0]) {
      return res.status(404).json({ message: 'Тикет не найден' });
    }
    const lastMsg = await pool.query(
      'SELECT author FROM feedback_messages WHERE ticket_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );
    if (!lastMsg.rows[0] || lastMsg.rows[0].author !== 'admin') {
      return res.status(400).json({ message: 'Дождитесь ответа поддержки перед следующим сообщением' });
    }
    await pool.query(
      'INSERT INTO feedback_messages (ticket_id, author, body) VALUES ($1, $2, $3)',
      [id, 'user', bodyTrim]
    );
    const messagesRes = await pool.query(
      'SELECT id, ticket_id, author, body, created_at FROM feedback_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
      [id]
    );
    const ticket = await pool.query(
      'SELECT id, user_id, created_at FROM feedback_tickets WHERE id = $1',
      [id]
    );
    const result = { ...ticket.rows[0], messages: messagesRes.rows };
    getIO().emitToAdmin('feedbackNewMessage', { ticketId: id });
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const ticketRes = await pool.query(
      'SELECT id FROM feedback_tickets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (!ticketRes.rows[0]) {
      return res.status(404).json({ message: 'Обращение не найдено' });
    }
    await pool.query('DELETE FROM feedback_tickets WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
