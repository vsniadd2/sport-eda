import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../../contexts/FavoritesContext';
import ProductCard from '../../components/ProductCard/ProductCard';
import Loader from '../../components/Loader/Loader';
import styles from './Favorites.module.css';

const API_URL = '/api';

export default function Favorites() {
  const { favoriteIds, refetch, synced } = useFavorites();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!synced || favoriteIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ids = favoriteIds.join(',');
    fetch(`${API_URL}/products?ids=${ids}`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [favoriteIds, synced]);

  if (!synced && favoriteIds.length === 0) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}> / </span>
            <span>Избранное</span>
          </nav>
          <h1 className={styles.title}>Избранное</h1>
          <Loader wrap />
        </div>
      </main>
    );
  }

  if (favoriteIds.length === 0) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}> / </span>
            <span>Избранное</span>
          </nav>
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <h1 className={styles.emptyTitle}>В избранном пока пусто</h1>
            <p className={styles.emptyText}>Добавляйте понравившиеся товары — они появятся здесь</p>
            <Link to="/catalog" className={styles.ctaLink}>Перейти в каталог</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/">Главная</Link>
          <span className={styles.breadcrumbSep}> / </span>
          <span>Избранное</span>
        </nav>
        <h1 className={styles.title}>Избранное</h1>
        <p className={styles.subtitle}>Товаров: {products.length}</p>

        {loading ? (
          <Loader wrap />
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showWishlist
                showAvailability
                layout="grid"
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
