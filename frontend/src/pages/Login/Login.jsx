import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from '../Auth.module.css';

const API_URL = '/api';

export default function Login() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.cardHeader} aria-hidden />
        <div className={styles.cardBody}>
          <div className={styles.cardTitleBlock}>
            <h1 className={styles.cardTitle}>Добро пожаловать</h1>
            <p className={styles.cardSubtitle}>Войдите в Sport EDA, чтобы получить доступ к заказам и персональным данным.</p>
          </div>
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
              <div className={styles.passwordLabelRow}>
                <label htmlFor="login-password" className={styles.input_label}>
                  Пароль
                </label>
                <Link to="/forgot-password" className={styles.forgotLinkInline}>Забыли пароль?</Link>
              </div>
              <div className={styles.passwordWrap}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input_field}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.visibilityBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          <div className={styles.cardFooter}>
            <p className={styles.footerText}>
              Нет аккаунта? <Link to="/register" className={styles.footerLink}>Зарегистрироваться</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
