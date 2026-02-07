import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../utils/formatPrice';
import ProductCard from '../../components/ProductCard/ProductCard';
import styles from './Favorites.module.css';

const API_URL = '/api';
const PLACEHOLDER = 'https://placehold.co/400x400/e5e7eb/6b7280?text=%D0%A2%D0%BE%D0%B2%D0%B0%D1%80';

export default function Favorites() {
  const { favoriteIds, remove, refetch, synced } = useFavorites();
  const { addItem } = useCart();
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
          <h1 className={styles.title}>Избранное</h1>
          <p className={styles.loading}>Загрузка...</p>
        </div>
      </main>
    );
  }

  if (favoriteIds.length === 0) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Избранное</h1>
          <p className={styles.empty}>В избранном пока ничего нет.</p>
          <Link to="/catalog" className={styles.ctaLink}>Перейти в каталог</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/">Главная</Link>
          <span className={styles.breadcrumbSep}> &gt; </span>
          <span>Избранное</span>
        </nav>
        <h1 className={styles.title}>Избранное</h1>
        <p className={styles.subtitle}>Товаров: {products.length}</p>
        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
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
