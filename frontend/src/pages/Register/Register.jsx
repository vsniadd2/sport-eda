import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from '../Auth.module.css';

const API_URL = '/api';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);
  const { login } = useAuth();
  const { notify } = useNotifications();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (submitLock.current) return;
    submitLock.current = true;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          patronymic: patronymic.trim() || undefined,
          username: username.trim(),
          email: email.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (res.status === 409 ? 'Пользователь уже существует' : 'Ошибка регистрации'));
      login(data.token, data.user);
      notify('Регистрация успешна', 'success');
      navigate('/');
    } catch (err) {
      setError(err.message);
      notify(err.message, 'error');
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  return (
    <main className={styles.wrapper}>
      <div className={`${styles.card} ${styles.cardRegister}`}>
        <div className={styles.formHeaderRegister}>
          <h2 className={styles.formHeaderTitle}>Создайте аккаунт</h2>
          <p className={styles.formHeaderSubtitle}>
            Присоединяйтесь к сообществу Sport EDA и отслеживайте свои результаты.
          </p>
        </div>
        <form onSubmit={handleSubmit} className={styles.formRegister}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formRow}>
            <div className={styles.input_container}>
              <label htmlFor="reg-firstname" className={styles.input_label}>Имя</label>
              <input
                id="reg-firstname"
                type="text"
                className={styles.input_field}
                placeholder="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className={styles.input_container}>
              <label htmlFor="reg-lastname" className={styles.input_label}>Фамилия</label>
              <input
                id="reg-lastname"
                type="text"
                className={styles.input_field}
                placeholder="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.input_container}>
              <label htmlFor="reg-patronymic" className={styles.input_label}>
                Отчество <span className={styles.labelOptional}>(необязательно)</span>
              </label>
              <input
                id="reg-patronymic"
                type="text"
                className={styles.input_field}
                placeholder="Отчество"
                value={patronymic}
                onChange={(e) => setPatronymic(e.target.value)}
              />
            </div>
            <div className={styles.input_container}>
              <label htmlFor="reg-username" className={styles.input_label}>Имя пользователя</label>
              <input
                id="reg-username"
                type="text"
                className={styles.input_field}
                placeholder="johndoe24"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          <div className={styles.input_container}>
            <label htmlFor="reg-email" className={styles.input_label}>
              Email <span className={styles.labelOptional}>(необязательно)</span>
            </label>
            <input
              id="reg-email"
              type="email"
              className={styles.input_field}
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.input_container}>
              <label htmlFor="reg-password" className={styles.input_label}>Пароль</label>
              <input
                id="reg-password"
                type="password"
                className={styles.input_field}
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className={styles.inputHint}>Не менее 6 символов.</p>
            </div>
            <div className={styles.input_container}>
              <label htmlFor="reg-confirm" className={styles.input_label}>Подтверждение пароля</label>
              <input
                id="reg-confirm"
                type="password"
                className={styles.input_field}
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <div className={styles.submitWrapRegister}>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              <span className={styles.submitBtnIcon} aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </span>
              {loading ? 'Регистрация...' : 'Создать аккаунт'}
            </button>
          </div>
          <div className={`${styles.cardFooter} ${styles.cardFooterRegister}`}>
            <p className={styles.footerText}>
              Уже есть аккаунт? <Link to="/login" className={styles.footerLink}>Войти</Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
