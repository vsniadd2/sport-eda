import { useEffect } from 'react';
import styles from './NotificationContainer.module.css';

const AUTO_DISMISS_MS = 4500;

export default function NotificationContainer({ items, onDismiss }) {
  return (
    <div className={styles.container} aria-live="polite">
      {items.map((item) => (
        <Toast key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function Toast({ item, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`${styles.toast} ${styles[item.type] || ''}`} role="alert">
      <span className={styles.message}>{item.message}</span>
      <button type="button" className={styles.close} onClick={onDismiss} aria-label="Закрыть">
        ×
      </button>
    </div>
  );
}
