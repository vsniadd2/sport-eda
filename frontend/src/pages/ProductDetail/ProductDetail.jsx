import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../utils/formatPrice';
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
  const { user } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [cartAdded, setCartAdded] = useState(false);

  const productId = String(id ?? '');
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
    if (!product) return;
    const imgUrl = product.has_image ? `/api/products/${product.id}/image` : (product.image_url?.startsWith('http') ? product.image_url : null);
    addItem(product.id, 1, parseFloat(product.price), product.name, imgUrl);
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
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
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const inStock = product.in_stock !== false;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/">Главная</Link>
          <span className={styles.breadcrumbSep}> &gt; </span>
          <Link to="/catalog">Каталог</Link>
          {product.category_name && (
            <>
              <span className={styles.breadcrumbSep}> &gt; </span>
              <Link to={`/catalog?category=${product.category_slug || ''}`}>{product.category_name}</Link>
            </>
          )}
          <span className={styles.breadcrumbSep}> &gt; </span>
          <span>{product.name}{product.article ? ` арт ${product.article}` : ''}</span>
        </nav>

        <div className={styles.productLayout}>
          <div className={styles.imageBlock}>
            <div className={styles.imageWrap}>
              <img src={imageUrl} alt={product.name} className={styles.image} />
            </div>
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.infoBlock}>
              {product.article && <span className={styles.badge}>НОВИНКА</span>}
              <h1 className={styles.title}>{product.name}{product.article ? ` арт ${product.article}` : ''}</h1>
              <div className={styles.reviewLine}>
                <span className={styles.starsIcon}>{'★'}</span>
                {reviews.length === 0 ? (
                  <button type="button" className={styles.reviewLink} onClick={() => document.getElementById('reviews')?.scrollIntoView()}>
                    0 Нет отзывов
                  </button>
                ) : (
                  <button type="button" className={styles.reviewLink} onClick={() => document.getElementById('reviews')?.scrollIntoView()}>
                    {avgRating} — {reviews.length} отзывов
                  </button>
                )}
              </div>

              {(product.description || product.weight || product.manufacturer) && (
                <div className={styles.characteristics}>
                  <h3 className={styles.characteristicsTitle}>Характеристики</h3>
                  <ul className={styles.characteristicsList}>
                    {product.description && (
                      <li><strong>Состав товара</strong> — {product.description}</li>
                    )}
                    {product.manufacturer && (
                      <li><strong>Производитель</strong> — {product.manufacturer}</li>
                    )}
                    {product.weight && (
                      <li><strong>Вес</strong> — {product.weight}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className={styles.priceCard}>
              <p className={styles.price}>{formatPrice(product.price)}</p>
              <button type="button" className={styles.btnPrimary} onClick={handleAddToCart} disabled={cartAdded}>
                {cartAdded ? 'Добавлено в корзину' : 'Купить'}
              </button>
              <button type="button" className={styles.btnSecondary} onClick={handleAddToCart}>
                Купить в 1 клик
              </button>
              <ul className={styles.serviceList}>
                <li>
                  <span className={styles.serviceIcon} data-instock={inStock}>✓</span>
                  {inStock ? 'Есть в наличии' : 'Нет в наличии'}
                </li>
                <li>
                  <span className={styles.serviceIcon}>🚚</span>
                  Рассчитать доставку
                </li>
                <li>
                  <span className={styles.serviceIcon}>🏷</span>
                  Нашли дешевле?
                </li>
              </ul>
            </div>
          </div>
        </div>

        <section id="reviews" className={styles.reviews}>
          <h2 className={styles.reviewsTitle}>Отзывы</h2>
          {!user && (
            <p className={styles.reviewHint}><Link to="/login">Войдите</Link>, чтобы видеть форму отзыва.</p>
          )}
          {user && !canReview && (
            <p className={styles.reviewHint}>Оставить отзыв могут только покупатели этого товара.</p>
          )}
          {user && canReview && (
            <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
              {reviewError && <div className={styles.reviewError}>{reviewError}</div>}
              <div className={styles.reviewRow}>
                <label>Оценка:</label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((f) => ({ ...f, rating: +e.target.value }))}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Текст отзыва (опционально)"
                value={reviewForm.text}
                onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))}
                rows={3}
              />
              <button type="submit" disabled={reviewSubmitting} className={styles.reviewSubmit}>
                {reviewSubmitting ? 'Отправка...' : 'Оставить отзыв'}
              </button>
            </form>
          )}
          <div className={styles.reviewList}>
            {reviews.length === 0 ? (
              <p className={styles.noReviews}>Пока нет отзывов</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewUser}>{r.username || 'Пользователь'}</span>
                    <span className={styles.reviewStars}>{'★'.repeat(r.rating)}</span>
                    <span className={styles.reviewDate}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {r.text && <p className={styles.reviewText}>{r.text}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
