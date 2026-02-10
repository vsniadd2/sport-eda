import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from '../Auth.module.css';

const API_URL = '/api';

export default function Login() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { notify } = useNotifications();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка входа');
      login(data.token, data.user);
      notify('Вход выполнен', 'success');
      navigate('/');
    } catch (err) {
      setError(err.message);
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2>Вход</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.input_container}>
            <label htmlFor="login-input" className={styles.input_label}>
              Email или имя пользователя
            </label>
            <input
              id="login-input"
              type="text"
              className={styles.input_field}
              placeholder="Введите email или имя пользователя"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              required
            />
          </div>
          <div className={styles.input_container}>
            <label htmlFor="login-password" className={styles.input_label}>
              Пароль
            </label>
            <input
              id="login-password"
              type="password"
              className={styles.input_field}
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
          <p className={styles.forgotLink}>
            <Link to="/forgot-password">Забыли пароль?</Link>
          </p>
        </form>
        <p className={styles.footer}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}
