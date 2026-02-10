import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from '../Auth.module.css';

const API_URL = '/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { notify } = useNotifications();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSent(false);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка отправки');
      setSent(true);
      notify('Проверьте почту', 'success');
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
        <h2>Сброс пароля</h2>
        {sent ? (
          <div className={styles.successMessage}>
            Если этот email зарегистрирован, на него отправлена ссылка для сброса пароля. Проверьте почту.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.input_container}>
              <label htmlFor="forgot-email" className={styles.input_label}>
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                className={styles.input_field}
                placeholder="Введите email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </button>
          </form>
        )}
        <p className={styles.footer}>
          <Link to="/login">Вернуться к входу</Link>
        </p>
      </div>
    </div>
  );
}
