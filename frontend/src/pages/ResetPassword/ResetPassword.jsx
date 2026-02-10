import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from '../Auth.module.css';

const API_URL = '/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useNotifications();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setError('Пароль минимум 6 символов');
      return;
    }
    if (!token.trim()) {
      setError('Неверная ссылка. Запросите сброс пароля снова.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка сброса пароля');
      notify('Пароль изменён. Войдите с новым паролем.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.message);
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h2>Сброс пароля</h2>
          <div className={styles.error}>
            Неверная ссылка. Перейдите по ссылке из письма или <Link to="/forgot-password">запросите сброс пароля снова</Link>.
          </div>
          <p className={styles.footer}>
            <Link to="/login">Войти</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2>Новый пароль</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.input_container}>
            <label htmlFor="reset-new" className={styles.input_label}>
              Новый пароль
            </label>
            <input
              id="reset-new"
              type="password"
              className={styles.input_field}
              placeholder="Минимум 6 символов"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className={styles.input_container}>
            <label htmlFor="reset-confirm" className={styles.input_label}>
              Подтверждение пароля
            </label>
            <input
              id="reset-confirm"
              type="password"
              className={styles.input_field}
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>
        <p className={styles.footer}>
          <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}
