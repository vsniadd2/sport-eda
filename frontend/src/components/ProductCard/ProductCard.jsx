import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import styles from './ProductCard.module.css';

const PLACEHOLDER = 'https://placehold.co/300x300/e5e7eb/6b7280?text=%D0%A2%D0%BE%D0%B2%D0%B0%D1%80';

export default function ProductCard({ product, showTag, showAvailability, showWishlist, layout, compact }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addItem, getQuantity, updateQuantity } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const { notify } = useNotifications();

  const inFavorites = showWishlist && isFavorite(product.id);
  const cartQty = getQuantity(product.id);
  const inCart = cartQty > 0;

  const effectivePrice = (product.is_sale && product.sale_price != null) ? parseFloat(product.sale_price) : parseFloat(product.price);
  const showSalePrice = product.is_sale && product.sale_price != null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    addItem(product.id, 1, effectivePrice, product.name);
    notify('Товар добавлен в корзину', 'info');
  };

  const handleIncrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    addItem(product.id, 1, effectivePrice, product.name);
  };

  const handleDecrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartQty > 1) {
      updateQuantity(product.id, cartQty - 1);
    } else {
      updateQuantity(product.id, 0); // Удалит из корзины
    }
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
    <article className={`${styles.card} ${layout === 'list' ? styles.cardList : ''} ${compact ? styles.cardCompact : ''}`}>
      <Link to={`/catalog/${product.id}`} className={styles.link}>
      {showWishlist && (
        <button type="button" className={styles.wishlistBtn} onClick={handleWishlist} aria-label={inFavorites ? 'Убрать из избранного' : 'В избранное'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      )}
      {(showTag || product.is_sale) && (
        <span className={styles.tag}>Акция</span>
      )}
      <div className={styles.imageWrap}>
        <img src={imageUrl} alt={product.name} className={styles.image} loading="lazy" decoding="async" />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        {product.weight && <p className={styles.weight}>{product.weight}</p>}
        {showAvailability && (
          <p className={(product.quantity ?? 0) <= 0 ? styles.availabilityOut : styles.availability}>
            <span className={(product.quantity ?? 0) <= 0 ? styles.availabilityDotOut : styles.availabilityDot} />
            {(product.quantity ?? 0) <= 0 ? 'Нет в наличии' : `В наличии: ${product.quantity} шт`}
          </p>
        )}
        {!showAvailability && product.description && <p className={styles.desc}>{product.description}</p>}
        {!showAvailability && (
          <div className={styles.rating}>
            <span className={styles.ratingEmpty}>{'☆'.repeat(5)}</span>
            <span className={styles.ratingCount}>0</span>
          </div>
        )}
        <div className={styles.priceWrap}>
          {showSalePrice ? (
            <>
              <span className={styles.priceOld}>{formatPrice(product.price, '/шт')}</span>
              <span className={styles.price}>{formatPrice(product.sale_price, '/шт')}</span>
            </>
          ) : (
            <span className={styles.price}>{formatPrice(product.price, '/шт')}</span>
          )}
        </div>
        {inCart ? (
          <div className={styles.quantityControl}>
            <button type="button" className={styles.qtyBtn} onClick={handleDecrease} aria-label="Уменьшить">
              −
            </button>
            <span className={styles.qtyValue}>{cartQty}</span>
            <button type="button" className={styles.qtyBtn} onClick={handleIncrease} aria-label="Увеличить">
              +
            </button>
          </div>
        ) : (
          <button type="button" className={styles.btn} onClick={handleAddToCart}>
            В корзину
          </button>
        )}
      </div>
      </Link>
    </article>
  );
}
