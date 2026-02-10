import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import { formatDate } from '../../utils/formatDate';
import ProductCard from '../../components/ProductCard/ProductCard';
import Loader from '../../components/Loader/Loader';
import styles from './ProductDetail.module.css';

const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';
const PLACEHOLDER = 'https://placehold.co/400x400/e5e7eb/6b7280?text=%D0%A2%D0%BE%D0%B2%D0%B0%D1%80';

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, getQuantity, updateQuantity } = useCart();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { notify } = useNotifications();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [editingMyReview, setEditingMyReview] = useState(false);
  const [sameCategoryProducts, setSameCategoryProducts] = useState([]);
  const reviewListRef = useRef(null);

  const productId = String(id ?? '');
  const cartQty = getQuantity(product?.id || 0);
  const inCart = cartQty > 0;
  const myReview = reviews.find((r) => Number(r.user_id) === Number(user?.id));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setError('Нет ID товара');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [prRes, rvRes] = await Promise.all([
          fetch(`${API_URL}/products/${productId}`),
          fetch(`${API_URL}/reviews/product/${productId}`),
        ]);
        const pr = await prRes.json().catch(() => ({}));
        const rv = await rvRes.json().catch(() => []);
        if (cancelled) return;
        if (!prRes.ok || !pr?.id) {
          setError(pr?.message || 'Товар не найден');
          setProduct(null);
        } else {
          setProduct(pr);
          setError('');
        }
        setReviews(Array.isArray(rv) ? rv : []);
        if (pr?.category_slug && prRes.ok) {
          fetch(`${API_URL}/products?category=${encodeURIComponent(pr.category_slug)}&sort=sales&limit=9`)
            .then((r) => r.json())
            .then((list) => {
              if (!cancelled && Array.isArray(list)) {
                setSameCategoryProducts(list.filter((p) => p.id !== pr.id).slice(0, 8));
              }
            })
            .catch(() => { if (!cancelled) setSameCategoryProducts([]); });
        } else if (!cancelled) setSameCategoryProducts([]);
      } catch {
        if (!cancelled) setError('Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  useEffect(() => {
    if (!user || !productId) {
      setCanReview(false);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/reviews/product/${productId}/can-review`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCanReview(!!data.canReview);
      })
      .catch(() => { if (!cancelled) setCanReview(false); });
    return () => { cancelled = true; };
  }, [user, productId]);

  const handleAddToCart = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!product) return;
    const priceToUse = (product.is_sale && product.sale_price != null) ? parseFloat(product.sale_price) : parseFloat(product.price);
    const imgUrl = product.has_image ? `/api/products/${product.id}/image` : (product.image_url?.startsWith('http') ? product.image_url : null);
    addItem(product.id, 1, priceToUse, product.name, imgUrl);
    notify('Товар добавлен в корзину', 'info');
  };

  const handleIncrease = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!product) return;
    const priceToUse = (product.is_sale && product.sale_price != null) ? parseFloat(product.sale_price) : parseFloat(product.price);
    addItem(product.id, 1, priceToUse, product.name);
  };

  const handleDecrease = () => {
    if (cartQty > 1) {
      updateQuantity(product.id, cartQty - 1);
    } else {
      updateQuantity(product.id, 0);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      notify('Ссылка скопирована', 'info');
    } catch {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, '_blank');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      setReviewError('Войдите, чтобы оставить отзыв');
      return;
    }
    if (!canReview) {
      setReviewError('Оставить отзыв могут только покупатели этого товара');
      return;
    }
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const res = await fetch(`${API_URL}/reviews/product/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ rating: reviewForm.rating, text: reviewForm.text || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      const withUsername = { ...data, username: user.username || user.email, user_id: user.id };
      setReviews((prev) => {
        const rest = prev.filter((r) => Number(r.user_id) !== Number(user.id));
        return [withUsername, ...rest];
      });
      setReviewForm({ rating: 5, text: '' });
      setEditingMyReview(false);
      notify(myReview ? 'Отзыв обновлён' : 'Отзыв добавлен', 'success');
    } catch (e) {
      setReviewError(e.message);
      notify(e.message, 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!user || !myReview) return;
    setReviewDeleting(true);
    setReviewError('');
    try {
      const res = await fetch(`${API_URL}/reviews/product/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка удаления');
      }
      setReviews((prev) => prev.filter((r) => r.id !== myReview.id));
      setReviewForm({ rating: 5, text: '' });
      setEditingMyReview(false);
      notify('Отзыв удалён', 'success');
    } catch (e) {
      setReviewError(e.message);
      notify(e.message, 'error');
    } finally {
      setReviewDeleting(false);
    }
  };

  const startEditMyReview = () => {
    if (!myReview) return;
    setReviewForm({ rating: myReview.rating, text: myReview.text || '' });
    setEditingMyReview(true);
    setReviewError('');
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <Loader wrap />
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorBlock}>
            <p className={styles.error}>{error || 'Товар не найден'}</p>
            <Link to="/catalog" className={styles.backLink}>Вернуться в каталог</Link>
          </div>
        </div>
      </main>
    );
  }

  const imageUrl = product.has_image
    ? `/api/products/${product.id}/image`
    : (product.image_url?.startsWith('http') ? product.image_url : PLACEHOLDER);
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const inFavorites = isFavorite(product.id);
  const showSalePrice = product.is_sale && product.sale_price != null;
  const effectivePrice = showSalePrice ? parseFloat(product.sale_price) : parseFloat(product.price);
  const oldPrice = showSalePrice ? product.price : null;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Хлебные крошки и действия */}
        <div className={styles.topBar}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link to="/catalog">Каталог</Link>
            {product.category_name && (
              <>
                <span className={styles.breadcrumbSep}>/</span>
                <Link to={`/catalog?category=${product.category_slug || ''}`}>{product.category_name}</Link>
              </>
            )}
          </nav>
          <div className={styles.topActions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${inFavorites ? styles.actionBtnActive : ''}`}
              onClick={() => toggleFavorite(product.id)}
              aria-label={inFavorites ? 'Убрать из избранного' : 'В избранное'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button type="button" className={styles.actionBtn} onClick={handleShare} aria-label="Поделиться">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Основной контент в стиле WB */}
        <div className={styles.productLayout}>
          {/* Галерея слева */}
          <div className={styles.gallery}>
            <div className={styles.imageWrap}>
              <img src={imageUrl} alt={product.name} className={styles.mainImage} loading="eager" decoding="async" />
              {(product.is_sale || product.is_hit || product.is_recommended) && (
                <div className={styles.badges}>
                  {product.is_sale && <span className={styles.badgeSale}>Акция</span>}
                  {product.is_hit && <span className={styles.badgeHit}>Хит</span>}
                  {product.is_recommended && <span className={styles.badgeRec}>Советуем</span>}
                </div>
              )}
            </div>
          </div>

          {/* Информация по центру */}
          <div className={styles.info}>
            {product.manufacturer && (
              <div className={styles.brandRow}>
                <span className={styles.brand}>{product.manufacturer}</span>
                <span className={styles.originalBadge}>✓ Оригинал</span>
              </div>
            )}
            <h1 className={styles.title}>{product.name}</h1>

            {reviews.length > 0 && (
              <button
                type="button"
                className={styles.ratingRow}
                onClick={() => reviewListRef.current?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span className={styles.ratingStars}>{'★'.repeat(Math.round(parseFloat(avgRating)))}</span>
                <span className={styles.ratingValue}>{avgRating}</span>
                <span className={styles.ratingCount}>{reviews.length} отзывов</span>
              </button>
            )}

            <div className={styles.specTable}>
              {product.article && (
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Артикул</span>
                  <span className={styles.specValue}>{product.article}</span>
                </div>
              )}
              {product.weight && (
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Вес</span>
                  <span className={styles.specValue}>{product.weight}</span>
                </div>
              )}
              {product.category_name && (
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Категория</span>
                  <span className={styles.specValue}>{product.category_name}</span>
                </div>
              )}
              <div className={styles.specRow}>
                <span className={styles.specLabel}>В наличии</span>
                <span className={styles.specValue}>{(product.quantity ?? 0) > 0 ? `${product.quantity} шт` : 'Нет'}</span>
              </div>
            </div>

            {product.description && (
              <div className={styles.descriptionBlock}>
                <h3 className={styles.descriptionTitle}>Описание</h3>
                <p className={styles.descriptionText}>{product.description}</p>
              </div>
            )}
          </div>

          {/* Блок покупки справа */}
          <aside className={styles.priceBlock}>
            <div className={styles.priceCard}>
              <div className={styles.priceRow}>
                <span className={styles.priceCurrent}>{formatPrice(effectivePrice)}</span>
                {oldPrice != null && (
                  <span className={styles.priceOld}>{formatPrice(oldPrice)}</span>
                )}
              </div>
              {oldPrice != null && (
                <div className={styles.discountBadge}>
                  Скидка {Math.round((1 - effectivePrice / parseFloat(oldPrice)) * 100)}%
                </div>
              )}

              {user ? (
                inCart ? (
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
                  <button type="button" className={styles.btnAddCart} onClick={handleAddToCart}>
                    В корзину
                  </button>
                )
              ) : (
                <Link to="/login" className={styles.btnAddCart}>Войдите, чтобы купить</Link>
              )}

              <Link to="/cart" className={styles.btnBuyNow}>
                Перейти в корзину
              </Link>

              <div className={styles.deliveryInfo}>
                <div className={styles.deliveryItem}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" rx="1"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  <span>Доставка по всей стране</span>
                </div>
                <div className={styles.deliveryItem}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  <span>Оплата онлайн или при получении</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Отзывы */}
        <section ref={reviewListRef} className={styles.reviewsSection}>
          <h2 className={styles.sectionTitle}>Отзывы о товаре</h2>
          {reviews.length === 0 ? (
            <p className={styles.noReviews}>Пока нет отзывов. Будьте первым, кто оставит отзыв.</p>
          ) : (
            <div className={styles.reviewList}>
              {reviews.slice(0, 6).map((r) => (
                <div key={r.id} className={styles.reviewCard}>
                  <div className={styles.reviewHead}>
                    <span className={styles.reviewUser}>{r.username || 'Покупатель'}</span>
                    <span className={styles.reviewDate}>{r.created_at ? formatDate(r.created_at) : ''}</span>
                  </div>
                  <div className={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  {r.text && <p className={styles.reviewText}>{r.text}</p>}
                  {r.admin_reply && (
                    <div className={styles.reviewAdminReply}>
                      <span className={styles.reviewAdminReplyLabel}>Ответ магазина</span>
                      {r.admin_replied_at && <span className={styles.reviewAdminReplyDate}>{formatDate(r.admin_replied_at)}</span>}
                      <p className={styles.reviewAdminReplyText}>{r.admin_reply}</p>
                    </div>
                  )}
                  {user && Number(r.user_id) === Number(user?.id) && !editingMyReview && (
                    <div className={styles.reviewActions}>
                      <button type="button" className={styles.reviewEditBtn} onClick={startEditMyReview}>Редактировать</button>
                      <button type="button" className={styles.reviewDeleteBtn} onClick={handleDeleteReview} disabled={reviewDeleting}>{reviewDeleting ? 'Удаление...' : 'Удалить'}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {user && (editingMyReview || (canReview && !myReview)) && (
            <div className={styles.reviewFormWrap}>
              <h3 className={styles.reviewFormTitle}>{editingMyReview ? 'Редактировать отзыв' : 'Оставить отзыв'}</h3>
              <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                {reviewError && <div className={styles.reviewError}>{reviewError}</div>}
                <div className={styles.reviewLabel}>
                  <span>Оценка</span>
                  <div className={styles.ratingStarsInput} role="group" aria-label="Оценка звёздами">
                    {[5, 4, 3, 2, 1].flatMap((n) => [
                      <input
                        key={`star-inp-${n}`}
                        type="radio"
                        name={`rate-${productId}`}
                        value={n}
                        id={`star${n}-${productId}`}
                        checked={reviewForm.rating === n}
                        onChange={(e) => setReviewForm((f) => ({ ...f, rating: +e.target.value }))}
                      />,
                      <label key={`star-lbl-${n}`} htmlFor={`star${n}-${productId}`} title={`${n} звезд`}> </label>,
                    ])}
                  </div>
                </div>
                <label className={styles.reviewLabel}>
                  Комментарий (по желанию)
                  <textarea
                    placeholder="Поделитесь впечатлениями о товаре"
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))}
                    rows={3}
                  />
                </label>
                <div className={styles.reviewFormActions}>
                  <button type="submit" disabled={reviewSubmitting} className={styles.reviewSubmit}>
                    {reviewSubmitting ? 'Отправка...' : (editingMyReview ? 'Сохранить' : 'Отправить отзыв')}
                  </button>
                  {editingMyReview && (
                    <button type="button" className={styles.reviewCancelBtn} onClick={() => { setEditingMyReview(false); setReviewError(''); }}>Отмена</button>
                  )}
                </div>
              </form>
            </div>
          )}
          {user && !canReview && reviews.length > 0 && !myReview && (
            <p className={styles.reviewHint}>Оставить отзыв могут только покупатели этого товара.</p>
          )}
          {!user && (
            <p className={styles.reviewHint}><Link to="/login">Войдите</Link>, чтобы оставить отзыв.</p>
          )}
        </section>

        {/* Рекомендуемые товары */}
        {sameCategoryProducts.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.sectionTitle}>Рекомендуемые товары</h2>
            <div className={styles.relatedGrid}>
              {sameCategoryProducts.map((p) => (
                <ProductCard key={p.id} product={p} showWishlist layout="grid" compact />
              ))}
            </div>
            {product?.category_slug && (
              <Link to={`/catalog?category=${product.category_slug}`} className={styles.categoryLink}>
                Все товары категории «{product.category_name}»
              </Link>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
