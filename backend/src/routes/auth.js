import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email и пароль обязательны' });
    }
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ message: 'Имя пользователя обязательно (минимум 2 символа)' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role, username) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role',
      [email.toLowerCase(), passwordHash, 'user', username.trim().toLowerCase()]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, role: user.role || 'user' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role || 'user' } });
  } catch (err) {
    if (err.code === '23505') {
      const msg = err.constraint?.includes('username') ? 'Имя пользователя уже занято' : 'Пользователь с таким email уже существует';
      return res.status(400).json({ message: msg });
    }
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { login: loginInput, password } = req.body;
    const emailOrUsername = loginInput?.trim()?.toLowerCase();
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Email/имя пользователя и пароль обязательны' });
    }
    const result = await pool.query(
      'SELECT id, email, username, password_hash, role FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1',
      [emailOrUsername]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }
    const role = user.role || 'user';
    const displayName = user.username || user.email?.split('@')[0] || user.email;
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, role, displayName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
