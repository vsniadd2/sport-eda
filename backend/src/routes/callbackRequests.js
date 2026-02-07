import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, phone } = req.body || {};
    const phoneTrim = typeof phone === 'string' ? phone.trim() : '';
    if (!phoneTrim) {
      return res.status(400).json({ message: 'Укажите номер телефона' });
    }
    const nameVal = typeof name === 'string' ? name.trim() || null : null;
    const result = await pool.query(
      'INSERT INTO callback_requests (name, phone) VALUES ($1, $2) RETURNING id, name, phone, created_at',
      [nameVal, phoneTrim]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
