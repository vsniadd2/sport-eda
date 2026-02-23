import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.block}>
          <span className={styles.code} aria-hidden>404</span>
          <div className={styles.icon} aria-hidden>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <h1 className={styles.title}>Страница не найдена</h1>
          <p className={styles.text}>
            Запрашиваемая страница не существует или была перемещена. Вернитесь на главную или в каталог.
          </p>
          <div className={styles.actions}>
            <Link to="/" className={styles.primaryBtn}>На главную</Link>
            <Link to="/catalog" className={styles.secondaryBtn}>В каталог</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
