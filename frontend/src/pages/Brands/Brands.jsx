import { useState, useEffect } from 'react';
import styles from './Brands.module.css';

export default function Brands() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    fetch('/api/home/brands')
      .then((r) => r.ok ? r.json() : [])
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1>Бренды</h1>

        {brands.length === 0 ? (
          <p className={styles.emptyMessage}>
            Пока ничего нет.
          </p>
        ) : (
          <div className={styles.brandsGrid}>
            {brands.map((b) => (
              <div key={b.id} className={styles.brandCard}>
                {b.has_image && (
                  <div className={styles.brandCardImage}>
                    <img src={`/api/home/brands/${b.id}/image`} alt={b.name || ''} />
                  </div>
                )}
                <div className={styles.brandCardBody}>
                  <h3 className={styles.brandCardName}>{b.name}</h3>
                  {b.description && <p className={styles.brandCardDescription}>{b.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
