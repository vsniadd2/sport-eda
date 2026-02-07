import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { formatPrice } from '../../utils/formatPrice';
import { formatDate } from '../../utils/formatDate';
import ProductCard from '../../components/ProductCard/ProductCard';
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
  const { addItem } = useCart();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [cartAdded, setCartAdded] = useState(false);
  const [sameCategoryProducts, setSameCategoryProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const reviewListRef = useRef(null);

  const productId = String(id ?? '');

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
          fetch(`${API_URL}/products?category=${encodeURIComponent(pr.category_slug)}`)
            .then((r) => r.json())
            .then((list) => {
              if (!cancelled) setSameCategoryProducts(Array.isArray(list) ? list.filter((p) => p.id !== pr.id).slice(0, 12) : []);
            })
            .catch(() => { if (!cancelled) setSameCategoryProducts([]); });
        } else if (!cancelled) setSameCategoryProducts([]);
        fetch(`${API_URL}/home`)
          .then((r) => r.json())
          .then((data) => {
            if (!cancelled && data?.bestProducts) {
              setRecommendedProducts(Array.isArray(data.bestProducts) ? data.bestProducts.filter((p) => p.id !== pr?.id).slice(0, 8) : []);
            }
          })
          .catch(() => { if (!cancelled) setRecommendedProducts([]); });
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
      .then((data) => { if (!cancelled) setCanReview(!!data.canReview); })
      .catch(() => { if (!cancelled) setCanReview(false); });
    return () => { cancelled = true; };
  }, [user, productId]);

  const handleAddToCart = () => {
    if (!user) return;
    if (!product) return;
    const imgUrl = product.has_image ? `/api/products/${product.id}/image` : (product.image_url?.startsWith('http') ? product.image_url : null);
    addItem(product.id, 1, parseFloat(product.price), product.name, imgUrl);
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      // можно показать уведомление
    } else {
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
      setReviews((prev) => [{ ...data, username: user.username || user.email }, ...prev]);
      setReviewForm({ rating: 5, text: '' });
    } catch (e) {
      setReviewError(e.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.loadingText}>Загрузка...</p>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.error}>{error || 'Товар не найден'}</p>
          <Link to="/catalog" className={styles.backLink}>Вернуться в каталог</Link>
        </div>
      </main>
    );
  }

  const imageUrl = product.has_image
    ? `/api/products/${product.id}/image`
    : (product.image_url?.startsWith('http') ? product.image_url : PLACEHOLDER);
  const images = [imageUrl];
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const inFavorites = isFavorite(product.id);
  const oldPrice = product.is_sale ? (parseFloat(product.price) * 2.82).toFixed(2) : null;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Верхняя навигация: назад + хлебные крошки + действия */}
        <div className={styles.topBar}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link to="/catalog">Спорт</Link>
            {product.category_name && (
              <>
                <span className={styles.breadcrumbSep}>/</span>
                <Link to={`/catalog?category=${product.category_slug || ''}`}>Спортивное питание и косметика</Link>
              </>
            )}
            <span className={styles.breadcrumbSep}>/</span>
            <Link to={`/catalog?category=${product.category_slug || ''}`}>{product.category_name || 'Креатины'}</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbLast}>{product.manufacturer || 'PWR ultimate power'}</span>
          </nav>
          <div className={styles.topActions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => toggleFavorite(product.id)}
              aria-label={inFavorites ? 'Убрать из избранного' : 'В избранное'}
              data-active={inFavorites}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button type="button" className={styles.iconBtn} onClick={handleShare} aria-label="Поделиться">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Сообщить об ошибке">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </button>
          </div>
        </div>

        <div className={styles.productLayout}>
          {/* Левая колонка: вертикальные миниатюры + основное изображение */}
          <div className={styles.galleryColumn}>
            <div className={styles.thumbnails}>
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.thumb} ${selectedImageIndex === i ? styles.thumbActive : ''}`}
                  onClick={() => setSelectedImageIndex(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
            <div className={styles.mainImageWrap}>
              <img src={images[selectedImageIndex]} alt={product.name} className={styles.mainImage} />
            </div>
          </div>

          {/* Центр: информация о товаре */}
          <div className={styles.infoColumn}>
            <div className={styles.brandRow}>
              <span className={styles.brandName}>{product.manufacturer || 'PWR ultimate power'}</span>
            </div>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.ratingRow}>
              <span className={styles.ratingValue}>{avgRating ?? '4.9'}</span>
              <span className={styles.ratingStars} aria-hidden>★★★★★</span>
              <button type="button" className={styles.ratingLink} onClick={() => reviewListRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                {reviews.length > 0 ? `${reviews.length} оценок` : '56 100 оценок'}
              </button>
            </div>
            <p className={styles.weightLine}>{product.weight || '500 мл'} • <span>Без вкуса</span></p>
            <div className={styles.specTable}>
              {product.article && (
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Артикул</span>
                  <span className={styles.specValue}>{product.article}</span>
                  <button type="button" className={styles.copyBtn} onClick={() => navigator.clipboard?.writeText(product.article)} aria-label="Копировать">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              )}
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Состав</span>
                <span className={styles.specValue}>{product.description || 'Креатин моногидрат'}</span>
              </div>
              {product.weight && (
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Объём товара</span>
                  <span className={styles.specValue}>{product.weight}</span>
                </div>
              )}
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Вкус</span>
                <span className={styles.specValue}>без вкуса; натуральный вкус</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Форма выпуска</span>
                <span className={styles.specValue}>креатин моногидрат порошок</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Добавки</span>
                <span className={styles.specValue}>без добавок; не содержит сахар и сахарозаменители</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Тип креатина</span>
                <span className={styles.specValue}>Моногидрат в порошке; креатин моногидрат</span>
              </div>
            </div>
            <details className={styles.detailsBox}>
              <summary className={styles.detailsSummary}>Характеристики и описание</summary>
              <div className={styles.detailsContent}>
                {product.description && <p>{product.description}</p>}
                {!product.description && <p>Подробное описание товара отсутствует.</p>}
              </div>
            </details>
          </div>

          {/* Правая колонка: прайс блок (липкий) */}
          <div className={styles.priceColumn}>
            <div className={styles.priceCard}>
              <div className={styles.priceRow}>
                <span className={styles.priceCurrent}>{formatPrice(product.price)}</span>
                {oldPrice && (
                  <span className={styles.priceOld}>{formatPrice(oldPrice)}</span>
                )}
              </div>
              {user ? (
                <>
                  <button type="button" className={styles.btnAddCart} onClick={handleAddToCart} disabled={cartAdded}>
                    {cartAdded ? 'Добавлено' : 'Добавить в корзину'}
                  </button>
                </>
              ) : (
                <Link to="/login" className={styles.btnAddCart}>
                  Войдите, чтобы купить
                </Link>
              )}
              <div className={styles.deliveryInfo}>
                <div className={styles.deliveryRow}>
                  <span className={styles.deliveryLabel}>Последняя</span>
                  <span className={styles.deliveryValue}>сегодня WB</span>
                </div>
                <div className={styles.deliveryRow}>
                  <span className={styles.deliveryLabel}>AMA TERRIA</span>
                  <span className={styles.deliveryStars}>★ 4.9</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Оценки и отзывы */}
        <section ref={reviewListRef} className={styles.reviewsSection}>
          <div className={styles.reviewsHeader}>
            <h2 className={styles.reviewsTitle}>Оценки и отзывы</h2>
            <div className={styles.reviewsTabs}>
              <span className={styles.tabActive}>{reviews.length} оценок</span>
            </div>
          </div>
          <div className={styles.reviewsSummary}>
            <span className={styles.reviewsStars}>{'★'.repeat(5)}</span>
            <span className={styles.reviewsRatingValue}>{avgRating ?? '—'}</span>
            <span className={styles.reviewsCount}>{reviews.length} оценок</span>
          </div>
          <div className={styles.reviewCards}>
            {reviews.length === 0 ? (
              <p className={styles.noReviews}>Пока нет отзывов. Будьте первым.</p>
            ) : (
              reviews.slice(0, 6).map((r) => {
                const name = r.username || 'Покупатель';
                return (
                  <div key={r.id} className={styles.reviewCard}>
                    <div className={styles.reviewCardHeader}>
                      <span className={styles.reviewUser}>{name}</span>
                      <span className={styles.reviewDate}>{r.created_at ? formatDate(r.created_at) : ''}</span>
                    </div>
                    <div className={styles.reviewStars}>{'★'.repeat(r.rating)}</div>
                    {r.text && (
                      <div className={styles.reviewBlock}>
                        <span className={styles.reviewBlockLabel}>Комментарий</span>
                        <p className={styles.reviewText}>{r.text}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {reviews.length > 0 && (
            <button type="button" className={styles.reviewShowAll} onClick={() => document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' })}>
              Смотреть все отзывы
            </button>
          )}
          {!user && (
            <p className={styles.reviewHint}><Link to="/login">Войдите</Link>, чтобы оставить отзыв.</p>
          )}
          {user && !canReview && reviews.length > 0 && (
            <p className={styles.reviewHint}>Оставить отзыв могут только покупатели этого товара.</p>
          )}
          {user && canReview && (
            <div id="review-form" className={styles.reviewFormCard}>
              <h3 className={styles.reviewFormTitle}>Написать отзыв</h3>
              <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                {reviewError && <div className={styles.reviewError}>{reviewError}</div>}
                <div className={styles.reviewRow}>
                  <label htmlFor="review-rating">Оценка:</label>
                  <select
                    id="review-rating"
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm((f) => ({ ...f, rating: +e.target.value }))}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n} ★</option>
                    ))}
                  </select>
                </div>
                <textarea
                  placeholder="Текст отзыва (по желанию)"
                  value={reviewForm.text}
                  onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))}
                  rows={3}
                />
                <button type="submit" disabled={reviewSubmitting} className={styles.reviewSubmit}>
                  {reviewSubmitting ? 'Отправка...' : 'Оставить отзыв'}
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Продавец рекомендует */}
        {recommendedProducts.length > 0 && (
          <section className={styles.carouselSection}>
            <h2 className={styles.carouselTitle}>Продавец рекомендует</h2>
            <div className={styles.carousel}>
              {recommendedProducts.map((p) => (
                <div key={p.id} className={styles.carouselCard}>
                  <ProductCard product={p} showAvailability showWishlist />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Смотрите также */}
        {sameCategoryProducts.length > 0 && (
          <section className={styles.carouselSection}>
            <h2 className={styles.carouselTitle}>Смотрите также</h2>
            <div className={styles.carousel}>
              {sameCategoryProducts.map((p) => (
                <div key={p.id} className={styles.carouselCard}>
                  <ProductCard product={p} showAvailability showWishlist />
                </div>
              ))}
            </div>
            {product?.category_slug && (
              <Link to={`/catalog?category=${product.category_slug}`} className={styles.carouselLink}>
                Все товары категории
              </Link>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
