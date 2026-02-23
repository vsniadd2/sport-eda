import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { pool } from '../db.js';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

async function sendPasswordResetEmail(to, resetUrl) {
  const { mail, frontendUrl } = config;
  if (mail.user && mail.pass) {
    const transporter = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.secure,
      auth: { user: mail.user, pass: mail.pass },
    });
    await transporter.sendMail({
      from: mail.from,
      to,
      subject: 'Сброс пароля — Sport EDA',
      text: `Перейдите по ссылке для сброса пароля: ${resetUrl}\n\nСсылка действительна 1 час.`,
      html: `<p>Перейдите по ссылке для сброса пароля:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действительна 1 час.</p>`,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('[Password reset] Link (no SMTP configured):', resetUrl);
  }
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, username, first_name, last_name, patronymic } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Пароль обязателен (минимум 6 символов)' });
    }
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ message: 'Имя пользователя обязательно (минимум 2 символа)' });
    }
    const emailVal = email && String(email).trim() ? String(email).trim().toLowerCase() : null;
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, username, first_name, last_name, patronymic)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, username, role, first_name, last_name, patronymic, created_at`,
      [
        emailVal,
        passwordHash,
        'user',
        username.trim(),
        first_name ? String(first_name).trim() || null : null,
        last_name ? String(last_name).trim() || null : null,
        patronymic ? String(patronymic).trim() || null : null,
      ]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, role: user.role || 'user' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role || 'user',
        first_name: user.first_name,
        last_name: user.last_name,
        patronymic: user.patronymic,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      const msg = err.constraint?.includes('username') ? 'Имя пользователя уже занято' : 'Пользователь с таким email уже существует';
      return res.status(409).json({ message: msg });
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

router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ message: 'Укажите email' });
    }
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE LOWER(email) = $1',
      [email]
    );
    const user = userResult.rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [token, expires, user.id]
      );
      const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }
    res.json({ message: 'Если этот email зарегистрирован, на него отправлена ссылка для сброса пароля.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body || {};
    if (!token || !new_password || String(new_password).length < 6) {
      return res.status(400).json({ message: 'Нужны токен и новый пароль (минимум 6 символов)' });
    }
    const result = await pool.query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [String(token).trim()]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Ссылка недействительна или истекла' });
    }
    const passwordHash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );
    res.json({ message: 'Пароль успешно изменён. Войдите с новым паролем.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const id = req.user.userId;
    const result = await pool.query(
      'SELECT id, email, username, role, first_name, last_name, patronymic, created_at FROM users WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const id = req.user.userId;
    const { username, first_name, last_name, patronymic, current_password, new_password } = req.body || {};
    const updates = [];
    const values = [];
    let i = 1;
    if (username !== undefined) {
      const val = username === '' ? null : String(username).trim();
      if (val !== null && val.length < 2) return res.status(400).json({ message: 'Имя пользователя минимум 2 символа' });
      updates.push(`username = $${i++}`);
      values.push(val);
    }
    if (first_name !== undefined) { updates.push(`first_name = $${i++}`); values.push(first_name === '' ? null : String(first_name).trim()); }
    if (last_name !== undefined) { updates.push(`last_name = $${i++}`); values.push(last_name === '' ? null : String(last_name).trim()); }
    if (patronymic !== undefined) { updates.push(`patronymic = $${i++}`); values.push(patronymic === '' ? null : String(patronymic).trim()); }
    if (current_password != null && new_password != null) {
      if (String(new_password).length < 6) return res.status(400).json({ message: 'Новый пароль минимум 6 символов' });
      const userRow = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
      if (!userRow.rows[0]) return res.status(404).json({ message: 'Пользователь не найден' });
      const match = await bcrypt.compare(String(current_password), userRow.rows[0].password_hash);
      if (!match) return res.status(400).json({ message: 'Неверный текущий пароль' });
      const passwordHash = await bcrypt.hash(String(new_password), 10);
      updates.push(`password_hash = $${i++}`);
      values.push(passwordHash);
    }
    if (updates.length === 0) return res.status(400).json({ message: 'Нет данных для обновления' });
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, username, role, first_name, last_name, patronymic, created_at`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Имя пользователя уже занято' });
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router;
