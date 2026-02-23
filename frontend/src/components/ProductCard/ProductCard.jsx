import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import styles from './ProductCard.module.css';

const PLACEHOLDER = 'https://placehold.co/300x300/e5e7eb/6b7280?text=%D0%A2%D0%BE%D0%B2%D0%B0%D1%80';

export default function ProductCard({ product, showTag, showAvailability, showWishlist, layout, compact, variant }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addItem, getQuantity, updateQuantity } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const { notify } = useNotifications();

  const inFavorites = showWishlist && isFavorite(product.id);
  const cartQty = getQuantity(product.id);
  const inCart = cartQty > 0;
  const stock = product.quantity ?? 0;

  const [qtyFocused, setQtyFocused] = useState(false);
  const [qtyInput, setQtyInput] = useState('');

  const effectivePrice = (product.is_sale && product.sale_price != null) ? parseFloat(product.sale_price) : parseFloat(product.price);
  const showSalePrice = product.is_sale && product.sale_price != null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (stock <= 0) return;
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
    if (stock <= 0 || cartQty >= stock) return;
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

  const handleQtyFocus = (e) => {
    e.stopPropagation();
    setQtyFocused(true);
    setQtyInput(String(cartQty));
  };

  const handleQtyChange = (e) => {
    e.stopPropagation();
    const raw = e.target.value.replace(/\D/g, '');
    setQtyInput(raw);
  };

  const handleQtyBlur = (e) => {
    e.stopPropagation();
    const n = parseInt(qtyInput, 10);
    const val = (Number.isNaN(n) || n < 1) ? 1 : Math.min(stock, n);
    updateQuantity(product.id, val);
    setQtyFocused(false);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
  };
  const imageUrl = product.has_image
    ? `/api/products/${product.id}/image`
    : (product.image_url?.startsWith('http') ? product.image_url : PLACEHOLDER);

  const isCatalog = variant === 'catalog';
  const availabilityText = stock <= 0 ? 'Нет в наличии' : (stock <= 5 ? 'Осталось мало' : 'В наличии');
  const availabilityClass = stock <= 0 ? styles.availabilityOut : (stock <= 5 ? styles.availabilityLow : styles.availability);

  return (
    <article className={`${styles.card} ${layout === 'list' ? styles.cardList : ''} ${compact ? styles.cardCompact : ''} ${variant === 'home' ? styles.cardHome : ''} ${isCatalog ? styles.cardCatalog : ''}`}>
      <Link to={`/catalog/${product.id}`} className={styles.link}>
      {showWishlist && (
        <button type="button" className={styles.wishlistBtn} onClick={handleWishlist} aria-label={inFavorites ? 'Убрать из избранного' : 'В избранное'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      )}
      {(showTag || product.is_sale) && (
        <span className={styles.tag}>{isCatalog && product.is_sale ? 'Sale' : 'Акция'}</span>
      )}
      <div className={styles.imageWrap}>
        <img src={imageUrl} alt={product.name} className={styles.image} loading="lazy" decoding="async" />
      </div>
      <div className={styles.body}>
        {isCatalog && (product.category_name || product.brand) && (
          <span className={styles.brand}>{product.brand || product.category_name}</span>
        )}
        {showAvailability && (
          <p className={availabilityClass}>
            <span className={stock <= 0 ? styles.availabilityDotOut : (stock <= 5 ? styles.availabilityDotLow : styles.availabilityDot)} />
            {isCatalog ? availabilityText : (stock <= 0 ? 'Нет в наличии' : `В наличии: ${product.quantity} шт`)}
          </p>
        )}
        <h3 className={styles.name}>{product.name}</h3>
        {product.weight && <p className={styles.weight}>{product.weight}</p>}
        {!showAvailability && product.description && <p className={styles.desc}>{product.description}</p>}
        {!showAvailability && !isCatalog && (
          <div className={styles.rating}>
            <span className={styles.ratingEmpty}>{'☆'.repeat(5)}</span>
            <span className={styles.ratingCount}>0</span>
          </div>
        )}
        <div className={styles.priceWrap}>
          {showSalePrice ? (
            <>
              <span className={styles.priceOld}>{formatPrice(product.price, isCatalog ? '' : '/шт')}</span>
              <span className={isCatalog ? styles.priceSale : styles.price}>{formatPrice(product.sale_price, isCatalog ? '' : '/шт')}</span>
            </>
          ) : (
            <span className={styles.price}>{formatPrice(product.price, isCatalog ? '' : '/шт')}</span>
          )}
        </div>
        {inCart ? (
          <div className={styles.quantityControl} onClick={(e) => e.stopPropagation()} role="group" aria-label="Количество">
            <button type="button" className={styles.qtyBtn} onClick={handleDecrease} aria-label="Уменьшить">
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              className={styles.qtyValue}
              min={1}
              max={stock}
              value={qtyFocused ? qtyInput : String(cartQty)}
              onChange={handleQtyChange}
              onBlur={handleQtyBlur}
              onFocus={handleQtyFocus}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              aria-label="Количество"
            />
            <button type="button" className={styles.qtyBtn} onClick={handleIncrease} aria-label="Увеличить" disabled={stock <= 0 || cartQty >= stock}>
              +
            </button>
          </div>
        ) : (
          <button type="button" className={isCatalog ? styles.btnIconFull : styles.btn} onClick={handleAddToCart} disabled={stock <= 0} aria-label="В корзину">
            {isCatalog ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>
                <span>В корзину</span>
              </>
            ) : (
              'В корзину'
            )}
          </button>
        )}
      </div>
      </Link>
    </article>
  );
}
