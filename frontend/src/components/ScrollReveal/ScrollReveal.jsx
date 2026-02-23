import { useEffect, useRef, useState } from 'react';
import styles from './ScrollReveal.module.css';

/**
 * Обёртка: при прокрутке страницы элемент плавно появляется (fade + slide up).
 * Использует Intersection Observer, анимация срабатывает один раз при первом появлении в зоне видимости.
 */
export default function ScrollReveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.visible : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
}
