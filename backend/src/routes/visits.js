import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || '0.0.0.0';
}

router.post('/', async (req, res) => {
  try {
    const visitorKey = getClientIp(req);
    await pool.query(
      `INSERT INTO site_visits (visit_date, visitor_key) VALUES (CURRENT_DATE, $1) ON CONFLICT (visit_date, visitor_key) DO NOTHING`,
      [visitorKey]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
