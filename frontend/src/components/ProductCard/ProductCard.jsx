import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { formatPrice } from '../../utils/formatPrice';
import styles from './ProductCard.module.css';

const PLACEHOLDER = 'https://placehold.co/300x300/e5e7eb/6b7280?text=%D0%A2%D0%BE%D0%B2%D0%B0%D1%80';

export default function ProductCard({ product, showTag, showAvailability, showWishlist, layout }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const [added, setAdded] = useState(false);

  const inFavorites = showWishlist && isFavorite(product.id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    addItem(product.id, 1, parseFloat(product.price), product.name);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
  };
  const imageUrl = product.has_image
    ? `/api/products/${product.id}/image`
    : (product.image_url?.startsWith('http') ? product.image_url : PLACEHOLDER);

  return (
    <article className={`${styles.card} ${layout === 'list' ? styles.cardList : ''}`}>
      <Link to={`/catalog/${product.id}`} className={styles.link}>
      {showWishlist && (
        <button type="button" className={styles.wishlistBtn} onClick={handleWishlist} aria-label={inFavorites ? 'Убрать из избранного' : 'В избранное'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      )}
      {(showTag || product.is_promo) && (
        <span className={styles.tag}>Акция</span>
      )}
      <div className={styles.imageWrap}>
        <img src={imageUrl} alt={product.name} className={styles.image} />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        {product.weight && <p className={styles.weight}>{product.weight}</p>}
        {showAvailability && (
          <p className={styles.availability}>
            <span className={styles.availabilityDot} />
            Много
          </p>
        )}
        {!showAvailability && product.description && <p className={styles.desc}>{product.description}</p>}
        {!showAvailability && (
          <div className={styles.rating}>
            <span className={styles.ratingEmpty}>{'☆'.repeat(5)}</span>
            <span className={styles.ratingCount}>0</span>
          </div>
        )}
        <p className={styles.price}>{formatPrice(product.price, '/шт')}</p>
        <button type="button" className={styles.btn} onClick={handleAddToCart} disabled={added}>
          {added ? 'Добавлено в корзину' : 'В корзину'}
        </button>
      </div>
      </Link>
    </article>
  );
}
