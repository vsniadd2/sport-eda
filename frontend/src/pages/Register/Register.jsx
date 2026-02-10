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
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1>Регистрация</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
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
          <div className={styles.input_container}>
            <label htmlFor="reg-patronymic" className={styles.input_label}>Отчество</label>
            <input
              id="reg-patronymic"
              type="text"
              className={styles.input_field}
              placeholder="Отчество (необязательно)"
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
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className={styles.input_container}>
            <label htmlFor="reg-email" className={styles.input_label}>Почта</label>
            <input
              id="reg-email"
              type="email"
              className={styles.input_field}
              placeholder="Почта (необязательно)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
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
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        <p className={styles.footer}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}
