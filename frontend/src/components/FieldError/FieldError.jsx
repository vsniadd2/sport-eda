import styles from './FieldError.module.css';

export default function FieldError({ message = 'Заполните это поле.', id }) {
  return (
    <div id={id} className={styles.tooltip} role="alert">
      <span className={styles.pointer} aria-hidden />
      <span className={styles.icon} aria-hidden>!</span>
      <span className={styles.text}>{message}</span>
    </div>
  );
}
