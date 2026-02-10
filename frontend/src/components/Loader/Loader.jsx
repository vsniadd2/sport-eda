import styles from './Loader.module.css';

export default function Loader({ size = 'default', wrap = false, className = '' }) {
  const loader = (
    <div className={`${styles.loader} ${size === 'small' ? styles.loaderSmall : ''} ${className}`} role="status" aria-label="Загрузка">
      <span className={styles.bar} />
      <span className={styles.bar} />
      <span className={styles.bar} />
    </div>
  );
  if (wrap) {
    return <div className={styles.loaderWrap}>{loader}</div>;
  }
  return loader;
}
