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
    <main className={styles.wrapper}>
      <div className={`${styles.card} ${styles.cardForgot}`}>
        <div className={styles.forgotIconWrap}>
          <span className={styles.forgotIcon} aria-hidden>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
        </div>
        <div className={styles.forgotHeader}>
          <h1 className={styles.forgotTitle}>Восстановление пароля</h1>
          <p className={styles.forgotSubtitle}>
            Введите адрес электронной почты, связанный с вашим аккаунтом, и мы отправим вам ссылку для сброса пароля.
          </p>
        </div>
        {sent ? (
          <div className={styles.successMessage}>
            Если этот email зарегистрирован, на него отправлена ссылка для сброса пароля. Проверьте почту.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.formForgot}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.input_container}>
              <label htmlFor="forgot-email" className={styles.input_label}>
                Email
              </label>
              <div className={styles.emailInputWrap}>
                <span className={styles.emailInputIcon} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  className={styles.input_field}
                  placeholder="example@sporteda.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </button>
            <div className={styles.forgotBackWrap}>
              <Link to="/login" className={styles.forgotBackLink}>
                <span className={styles.forgotBackIcon} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </span>
                Вернуться к входу
              </Link>
            </div>
          </form>
        )}
        {sent && (
          <div className={styles.forgotBackWrap}>
            <Link to="/login" className={styles.forgotBackLink}>
              <span className={styles.forgotBackIcon} aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </span>
              Вернуться к входу
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
