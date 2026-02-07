import { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import styles from './CallbackModal.module.css';

export default function CallbackModal({ isOpen, onClose }) {
  const { notify } = useNotifications();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    if (!p) {
      notify('Укажите номер телефона', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/callback-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n || undefined, phone: p }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(data.message || 'Ошибка отправки. Попробуйте позже.', 'error');
        return;
      }
      notify('Заявка принята. Мы перезвоним вам в ближайшее время.', 'success');
      setName('');
      setPhone('');
      onClose();
    } catch {
      notify('Ошибка отправки. Попробуйте позже.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="callback-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="callback-title" className={styles.title}>Заказать звонок</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Как вас зовут
            <input
              type="text"
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              autoComplete="name"
            />
          </label>
          <label className={styles.label}>
            Номер телефона <span className={styles.required}>*</span>
            <input
              type="tel"
              placeholder="+375 (29) 123-45-67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles.input}
              autoComplete="tel"
              required
            />
          </label>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
