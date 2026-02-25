import { useState, useEffect, useRef, useMemo } from 'react';
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
const REVIEWS_PER_PAGE = 6;

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
  const [zoomOpen, setZoomOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedThumb, setSelectedThumb] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [qtyFocused, setQtyFocused] = useState(false);
  const [qtyInput, setQtyInput] = useState('');
  const reviewListRef = useRef(null);

  const productId = String(id ?? '');
  const cartQty = getQuantity(product?.id || 0);
  const inCart = cartQty > 0;
  const myReview = reviews.find((r) => Number(r.user_id) === Number(user?.id));

  const specItems = useMemo(() => {
    if (!product) return [];
    const items = [];
    if (product.article) items.push({ label: 'Артикул', value: product.article });
    if (product.weight) items.push({ label: 'Вес', value: product.weight });
    if (product.manufacturer) items.push({ label: 'Бренд', value: product.manufacturer });
    if (product.category_name) items.push({ label: 'Категория', value: product.category_name });
    items.push({ label: 'В наличии', value: (product.quantity ?? 0) > 0 ? `${product.quantity} шт` : 'Нет' });
    return items;
  }, [product]);

  const reviewDistribution = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return [0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const idx = 5 - (r.rating || 0);
      if (idx >= 0 && idx < 5) counts[idx]++;
    });
    return counts.map((c) => (total ? Math.round((c / total) * 100) : 0));
  }, [reviews]);

  useEffect(() => { window.scrollTo(0, 0); }, [productId]);
  useEffect(() => { setSelectedThumb(0); }, [productId]);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setZoomOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen]);

  useEffect(() => {
    if (!showShareModal) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setShowShareModal(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showShareModal]);

  useEffect(() => {
    if (!productId) { setLoading(false); setError('Нет ID товара'); return; }
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
        if (!prRes.ok || !pr?.id) { setError(pr?.message || 'Товар не найден'); setProduct(null); }
        else { setProduct(pr); setError(''); }
        setReviews(Array.isArray(rv) ? rv : []);
        setReviewsPage(1);
        if (pr?.category_slug && prRes.ok) {
          fetch(`${API_URL}/products?category=${encodeURIComponent(pr.category_slug)}&sort=sales&limit=9`)
            .then((r) => r.json())
            .then((list) => { if (!cancelled && Array.isArray(list)) setSameCategoryProducts(list.filter((p) => p.id !== pr.id).slice(0, 8)); })
            .catch(() => { if (!cancelled) setSameCategoryProducts([]); });
        } else if (!cancelled) setSameCategoryProducts([]);
      } catch { if (!cancelled) setError('Ошибка загрузки'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  useEffect(() => {
    if (!user || !productId) { setCanReview(false); return; }
    let cancelled = false;
    fetch(`${API_URL}/reviews/product/${productId}/can-review`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setCanReview(!!data.canReview); })
      .catch(() => { if (!cancelled) setCanReview(false); });
    return () => { cancelled = true; };
  }, [user, productId]);

  const available = product?.quantity ?? 0;

  const handleAddToCart = () => {
    if (!user) { navigate('/login'); return; }
    if (!product) return;
    if (available <= 0) { notify('Товар недоступен', 'info'); return; }
    if (cartQty >= available) { notify(`В корзину нельзя добавить больше ${available} шт.`, 'info'); return; }
    const priceToUse = (product.is_sale && product.sale_price != null) ? parseFloat(product.sale_price) : parseFloat(product.price);
    const imgUrl = product.has_image ? `/api/products/${product.id}/image` : (product.image_url?.startsWith('http') ? product.image_url : null);
    addItem(product.id, 1, priceToUse, product.name, imgUrl);
    notify('Товар добавлен в корзину', 'info');
  };

  const handleIncrease = () => {
    if (!user) { navigate('/login'); return; }
    if (!product) return;
    if (cartQty >= available) { notify(`В корзину нельзя добавить больше ${available} шт.`, 'info'); return; }
    const priceToUse = (product.is_sale && product.sale_price != null) ? parseFloat(product.sale_price) : parseFloat(product.price);
    addItem(product.id, 1, priceToUse, product.name);
  };

  const handleDecrease = () => {
    if (!product?.id) return;
    if (cartQty > 1) updateQuantity(product.id, cartQty - 1);
    else updateQuantity(product.id, 0);
  };

  const handleQtyFocus = () => { setQtyFocused(true); setQtyInput(String(cartQty)); };
  const handleQtyChange = (e) => { setQtyInput(e.target.value.replace(/\D/g, '')); };
  const handleQtyBlur = () => {
    const n = parseInt(qtyInput, 10);
    const val = (Number.isNaN(n) || n < 1) ? 1 : Math.min(available, n);
    updateQuantity(product.id, val);
    setQtyFocused(false);
  };

  const getShareUrl = () => window.location.href;
  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(getShareUrl()); notify('Ссылка скопирована', 'info'); setShowShareModal(false); }
    catch { notify('Не удалось скопировать', 'error'); }
  };
  const handleShareTelegram = () => { window.open(`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}`, '_blank', 'noopener,noreferrer'); setShowShareModal(false); };
  const handleShareWhatsApp = () => { const text = product?.name ? `${product.name} ${getShareUrl()}` : getShareUrl(); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); setShowShareModal(false); };
  const handleShareInstagram = async () => { try { await navigator.clipboard.writeText(getShareUrl()); notify('Ссылка скопирована — вставьте в Instagram', 'info'); window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer'); } catch { notify('Не удалось скопировать', 'error'); } };
  const handleShareTikTok = async () => { try { await navigator.clipboard.writeText(getShareUrl()); notify('Ссылка скопирована — вставьте в TikTok', 'info'); window.open('https://www.tiktok.com/', '_blank', 'noopener,noreferrer'); } catch { notify('Не удалось скопировать', 'error'); } };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) { setReviewError('Войдите, чтобы оставить отзыв'); return; }
    if (!canReview) { setReviewError('Оставить отзыв могут только покупатели этого товара'); return; }
    setReviewSubmitting(true); setReviewError('');
    try {
      const res = await fetch(`${API_URL}/reviews/product/${productId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ rating: reviewForm.rating, rating_quality: reviewForm.rating, rating_convenience: reviewForm.rating, text: reviewForm.text || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      const withUsername = { ...data, username: user.username || user.email, user_id: user.id };
      setReviews((prev) => { const rest = prev.filter((r) => Number(r.user_id) !== Number(user.id)); return [withUsername, ...rest]; });
      setReviewForm({ rating: 5, text: '' }); setEditingMyReview(false); setReviewsPage(1);
      notify(myReview ? 'Отзыв обновлён' : 'Отзыв добавлен', 'success');
    } catch (e) { setReviewError(e.message); notify(e.message, 'error'); }
    finally { setReviewSubmitting(false); }
  };

  const handleDeleteReview = async () => {
    if (!user || !myReview) return;
    setReviewDeleting(true); setReviewError('');
    try {
      const res = await fetch(`${API_URL}/reviews/product/${productId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || 'Ошибка удаления'); }
      setReviews((prev) => prev.filter((r) => r.id !== myReview.id));
      setReviewForm({ rating: 5, text: '' }); setEditingMyReview(false); setReviewsPage(1);
      notify('Отзыв удалён', 'success');
    } catch (e) { setReviewError(e.message); notify(e.message, 'error'); }
    finally { setReviewDeleting(false); }
  };

  const startEditMyReview = () => {
    if (!myReview) return;
    setReviewForm({ rating: myReview.rating ?? 5, text: myReview.text || '' });
    setEditingMyReview(true); setReviewError('');
  };

  /* ---------- RENDER ---------- */

  if (loading) return <main className={styles.main}><div className={styles.container}><Loader wrap /></div></main>;

  if (error || !product) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.errorBlock}>
            <svg className={styles.errorIcon} width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/></svg>
            <h1 className={styles.errorTitle}>Товар не найден</h1>
            <p className={styles.errorText}>{error && error !== 'Товар не найден' ? error : 'Такого товара нет в каталоге или ссылка устарела.'}</p>
            <Link to="/catalog" className={styles.backLink}>Вернуться в каталог</Link>
          </div>
        </div>
      </main>
    );
  }

  const imageCount = product.has_image ? (product.image_count > 0 ? Math.min(10, product.image_count) : 1) : 0;
  const imageUrls = imageCount > 0 ? Array.from({ length: imageCount }, (_, i) => `/api/products/${product.id}/images/${i}`) : [];
  const mainImageUrl = imageUrls[selectedThumb] || (product.has_image ? `/api/products/${product.id}/image` : (product.image_url?.startsWith('http') ? product.image_url : PLACEHOLDER));
  const canCycleImages = imageUrls.length > 1;
  const goPrevImage = () => setSelectedThumb((t) => (t - 1 + imageUrls.length) % imageUrls.length);
  const goNextImage = () => setSelectedThumb((t) => (t + 1) % imageUrls.length);

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const inFavorites = isFavorite(product.id);
  const showSalePrice = product.is_sale && product.sale_price != null;
  const effectivePrice = showSalePrice ? parseFloat(product.sale_price) : parseFloat(product.price);
  const oldPrice = showSalePrice ? product.price : null;

  const chevron = <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>;

  const trustBadges = Array.isArray(product.trust_badges) && product.trust_badges.length > 0
    ? product.trust_badges
    : ['Лабораторно проверено', 'Гарантия качества', '100% Оригинал'];

  const trustIcons = [
    <svg key="t1" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>,
    <svg key="t2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>,
    <svg key="t3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>,
  ];

  const fullStars = Math.round(parseFloat(avgRating) || 0);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* ===== BREADCRUMBS ===== */}
        <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          {chevron}
          <Link to="/catalog">Каталог</Link>
          {product.category_name && <>{chevron}<Link to={`/catalog?category=${product.category_slug || ''}`}>{product.category_name}</Link></>}
          {chevron}
          <span className={styles.breadcrumbCurrent}>{product.name}</span>
        </nav>

        {/* ===== PRODUCT SECTION (2 cols) ===== */}
        <div className={styles.productGrid}>
          {/* Left — Images */}
          <div className={styles.galleryCol}>
            <div className={styles.mainImageWrap}>
              {canCycleImages && (
                <button type="button" className={`${styles.galleryArrow} ${styles.arrowPrev}`} onClick={goPrevImage} aria-label="Назад">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
              )}
              <button type="button" className={styles.mainImageBtn} onClick={() => setZoomOpen(true)} aria-label="Увеличить">
                <img src={mainImageUrl} alt={product.name} className={styles.mainImage} loading="eager" />
              </button>
              {canCycleImages && (
                <button type="button" className={`${styles.galleryArrow} ${styles.arrowNext}`} onClick={goNextImage} aria-label="Вперёд">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              )}
              {(product.is_sale || product.is_hit || product.is_recommended) && (
                <div className={styles.imageBadges}>
                  {product.is_sale && <span className={styles.imageBadge}>Акция</span>}
                  {product.is_hit && <span className={`${styles.imageBadge} ${styles.imageBadgeDark}`}>Хит</span>}
                  {product.is_recommended && <span className={`${styles.imageBadge} ${styles.imageBadgeGreen}`}>Советуем</span>}
                </div>
              )}
            </div>
            {imageUrls.length > 0 && (
              <div className={styles.thumbGrid}>
                {imageUrls.map((url, i) => (
                  <button key={i} type="button" className={`${styles.thumb} ${selectedThumb === i ? styles.thumbActive : styles.thumbInactive}`} onClick={() => setSelectedThumb(i)} aria-label={`Фото ${i + 1}`}>
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Info */}
          <div className={styles.infoCol}>
            {/* Badge */}
            {(product.is_sale || product.is_hit || product.is_recommended) && (
              <div className={styles.topBadge}>
                {product.is_hit && <span>Хит продаж</span>}
                {product.is_sale && <span>Акция</span>}
                {product.is_recommended && <span>Рекомендуем</span>}
              </div>
            )}

            <h1 className={styles.productTitle}>{product.name}</h1>

            {/* Brand + Rating row */}
            <div className={styles.brandRatingRow}>
              {product.manufacturer && (
                <p className={styles.brandLine}>
                  Бренд: <span className={styles.brandName}>{product.manufacturer}</span>
                </p>
              )}
              {reviews.length > 0 && (
                <button type="button" className={styles.starsBtn} onClick={() => reviewListRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} className={s <= fullStars ? styles.starFilled : styles.starEmpty} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6z"/>
                    </svg>
                  ))}
                  <span className={styles.reviewCountSmall}>({reviews.length} отзыв{reviews.length === 1 ? '' : reviews.length < 5 ? 'а' : 'ов'})</span>
                </button>
              )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p className={styles.shortDesc}>{product.short_description}</p>
            )}

            {/* Price Card */}
            <div className={styles.priceCard}>
              <div className={styles.priceRow}>
                <span className={styles.priceMain}>{formatPrice(effectivePrice)}</span>
                {oldPrice != null && <span className={styles.priceOld}>{formatPrice(oldPrice)}</span>}
              </div>

              <div className={styles.cartRow}>
                {user && inCart && (
                  <div className={styles.qtyStepper}>
                    <button type="button" onClick={handleDecrease} aria-label="Уменьшить">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
                    </button>
                    <input
                      type="text" inputMode="numeric" className={styles.qtyInput}
                      min={1} max={available}
                      value={qtyFocused ? qtyInput : String(cartQty)}
                      onChange={handleQtyChange} onFocus={handleQtyFocus} onBlur={handleQtyBlur}
                      aria-label="Количество"
                    />
                    <button type="button" onClick={handleIncrease} disabled={cartQty >= available} aria-label="Увеличить">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </div>
                )}
                {user ? (
                  <button type="button" className={styles.addToCartBtn} onClick={handleAddToCart} disabled={available <= 0}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>
                    В корзину
                  </button>
                ) : (
                  <Link to="/login" className={styles.addToCartBtn}>Войдите, чтобы купить</Link>
                )}
              </div>
            </div>

            {/* Action row: favorite + share + cart link */}
            <div className={styles.actionRow}>
              <button type="button" className={`${styles.actionPill} ${inFavorites ? styles.actionPillActive : ''}`} onClick={() => toggleFavorite(product.id)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {inFavorites ? 'В избранном' : 'В избранное'}
              </button>
              <button type="button" className={styles.actionPill} onClick={() => setShowShareModal(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Поделиться
              </button>
              <Link to="/cart" className={styles.actionPill}>Перейти в корзину</Link>
            </div>

            {/* Benefits Cards */}
            <div className={styles.benefitsGrid}>
              {trustBadges.slice(0, 3).map((text, i) => (
                <div key={i} className={styles.benefitCard}>
                  <span className={styles.benefitIcon}>{trustIcons[i] || trustIcons[0]}</span>
                  <span className={styles.benefitText}>{text}</span>
                </div>
              ))}
            </div>

            {/* Trust line */}
            <div className={styles.trustLine}>
              <div className={styles.trustItem}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                <span>Лабораторно проверено</span>
              </div>
              <div className={styles.trustItem}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                <span>Гарантия качества</span>
              </div>
              <div className={styles.trustItem}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                <span>Быстрая доставка</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== DETAILS SECTION ===== */}
        <div className={styles.detailsSection}>
          <div className={styles.detailsGrid}>
            {/* Left 2/3 */}
            <div className={styles.detailsLeft}>
              {product.short_description && (
                <div className={styles.descBlock}>
                  <h3 className={styles.detailsHeading}>Краткое описание</h3>
                  <p className={styles.detailsParagraph}>{product.short_description}</p>
                </div>
              )}
              {product.description && (
                <div className={styles.descBlock}>
                  <h3 className={styles.detailsHeading}>Описание продукта</h3>
                  <p className={styles.detailsParagraph}>{product.description}</p>
                </div>
              )}

              <div className={styles.featureCardsGrid}>
                {specItems.length > 0 && (
                  <div className={styles.featureCard}>
                    <h4 className={styles.featureCardTitle}>
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      Характеристики
                    </h4>
                    <ul className={styles.featureList}>
                      {specItems.map((s) => (
                        <li key={s.label}><span className={styles.bullet}>•</span>{s.label}: {s.value}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {product.show_how_to_use && (product.how_to_use_step1 || product.how_to_use_intro) && (
                  <div className={styles.featureCard}>
                    <h4 className={styles.featureCardTitle}>
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                      Способ применения
                    </h4>
                    {product.how_to_use_intro && <p className={styles.featureIntro}>{product.how_to_use_intro}</p>}
                    <ul className={styles.featureList}>
                      {product.how_to_use_step1 && <li><span className={styles.bullet}>•</span>{product.how_to_use_step1}</li>}
                      {product.how_to_use_step2 && <li><span className={styles.bullet}>•</span>{product.how_to_use_step2}</li>}
                      {product.how_to_use_step3 && <li><span className={styles.bullet}>•</span>{product.how_to_use_step3}</li>}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right — Dark Review Sidebar */}
            <div className={styles.reviewSidebar} ref={reviewListRef}>
              <h4 className={styles.sidebarTitle}>Рейтинг покупателей</h4>
              <div className={styles.sidebarBigRating}>{avgRating || '0.0'}</div>
              <div className={styles.sidebarStars}>
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} className={s <= fullStars ? styles.sidebarStarFill : styles.sidebarStarEmpty} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6z"/>
                  </svg>
                ))}
              </div>
              <p className={styles.sidebarCount}>Основано на {reviews.length} реальных отзыв{reviews.length === 1 ? 'е' : reviews.length < 5 ? 'ах' : 'ах'}</p>
              <div className={styles.sidebarBars}>
                {[5,4,3,2,1].map((star, i) => (
                  <div key={star} className={styles.barRow}>
                    <span className={styles.barLabel}>{star}</span>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${reviewDistribution[i]}%` }}/>
                    </div>
                    <span className={styles.barPercent}>{reviewDistribution[i]}%</span>
                  </div>
                ))}
              </div>
              {(user && (canReview || myReview)) && (
                <button type="button" className={styles.sidebarReviewBtn} onClick={() => document.getElementById('review-form-wrap')?.scrollIntoView({ behavior: 'smooth' })}>
                  Оставить отзыв
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== REVIEWS LIST ===== */}
        {reviews.length > 0 && (
          <section className={styles.reviewsSection}>
            <h2 className={styles.sectionHeading}>Отзывы покупателей</h2>
            {(() => {
              const totalReviewPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
              const currentPage = Math.min(reviewsPage, totalReviewPages);
              const displayReviews = reviews.slice((currentPage - 1) * REVIEWS_PER_PAGE, currentPage * REVIEWS_PER_PAGE);
              return (
                <>
                  <div className={styles.reviewCardsGrid}>
                    {displayReviews.map((r) => {
                      const name = r.username || 'Покупатель';
                      const initials = name.split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2) || '?';
                      return (
                        <div key={r.id} className={styles.reviewCard}>
                          <div className={styles.reviewCardHead}>
                            <div className={styles.reviewUserRow}>
                              <span className={styles.reviewAvatar}>{initials}</span>
                              <div>
                                <p className={styles.reviewName}>{name}</p>
                                <div className={styles.reviewMiniStars}>
                                  {[1,2,3,4,5].map((s) => (
                                    <svg key={s} className={s <= (r.rating || 0) ? styles.starFilled : styles.starEmpty} viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6z"/>
                                    </svg>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className={styles.reviewDate}>{r.created_at ? formatDate(r.created_at) : ''}</span>
                          </div>
                          {r.text && <p className={styles.reviewText}>{r.text}</p>}
                          {r.admin_reply && (
                            <div className={styles.adminReply}>
                              <span className={styles.adminReplyLabel}>Ответ магазина</span>
                              {r.admin_replied_at && <span className={styles.adminReplyDate}>{formatDate(r.admin_replied_at)}</span>}
                              <p className={styles.adminReplyText}>{r.admin_reply}</p>
                            </div>
                          )}
                          {user && Number(r.user_id) === Number(user?.id) && !editingMyReview && (
                            <div className={styles.reviewActions}>
                              <button type="button" className={styles.reviewEditBtn} onClick={startEditMyReview}>Редактировать</button>
                              <button type="button" className={styles.reviewDeleteBtn} onClick={handleDeleteReview} disabled={reviewDeleting}>{reviewDeleting ? 'Удаление...' : 'Удалить'}</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {totalReviewPages > 1 && (
                    <div className={styles.pagination}>
                      {currentPage > 1 && <button type="button" className={styles.paginationBtn} onClick={() => setReviewsPage((p) => p - 1)}>Предыдущая</button>}
                      <span className={styles.paginationInfo}>Страница {currentPage} из {totalReviewPages}</span>
                      {currentPage < totalReviewPages && <button type="button" className={styles.paginationBtn} onClick={() => setReviewsPage((p) => p + 1)}>Загрузить ещё</button>}
                    </div>
                  )}
                </>
              );
            })()}
          </section>
        )}

        {/* Review Form */}
        {user && (editingMyReview || (canReview && !myReview)) && (
          <div id="review-form-wrap" className={styles.reviewFormWrap}>
            <h3 className={styles.reviewFormTitle}>{editingMyReview ? 'Редактировать отзыв' : 'Оставить отзыв'}</h3>
            <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
              {reviewError && <div className={styles.reviewError}>{reviewError}</div>}
              <div className={styles.ratingBlock}>
                <span className={styles.ratingLabel}>Оценка</span>
                <div className={styles.ratingStarsInput} role="group" aria-label="Оценка">
                  {[5,4,3,2,1].flatMap((n) => [
                    <input key={`star-${n}`} type="radio" name={`rate-${productId}`} value={n} id={`star${n}-${productId}`} checked={reviewForm.rating === n} onChange={(e) => setReviewForm((f) => ({ ...f, rating: +e.target.value }))} />,
                    <label key={`star-lbl-${n}`} htmlFor={`star${n}-${productId}`} title={`${n} звезд`}> </label>,
                  ])}
                </div>
              </div>
              <label className={styles.textareaLabel}>
                Отзыв
                <textarea className={styles.textarea} placeholder="Поделитесь впечатлениями о товаре" value={reviewForm.text} onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))} rows={3} onInput={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }} onFocus={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }} />
              </label>
              <div className={styles.formActions}>
                <button type="submit" disabled={reviewSubmitting} className={styles.submitBtn}>{reviewSubmitting ? 'Отправка...' : (editingMyReview ? 'Сохранить' : 'Отправить отзыв')}</button>
                {editingMyReview && <button type="button" className={styles.cancelBtn} onClick={() => { setEditingMyReview(false); setReviewError(''); }}>Отмена</button>}
              </div>
            </form>
          </div>
        )}
        {user && !canReview && reviews.length > 0 && !myReview && <p className={styles.reviewHint}>Оставить отзыв могут только покупатели этого товара.</p>}
        {!user && <p className={styles.reviewHint}><Link to="/login">Войдите</Link>, чтобы оставить отзыв.</p>}

        {/* Delivery */}
        <section className={styles.deliverySection}>
          <h2 className={styles.sectionHeading}>Самовывоз и оплата</h2>
          <div className={styles.deliveryCard}>
            <h3 className={styles.deliveryCardTitle}>Самовывоз</h3>
            <p className={styles.deliveryCardText}>Заказ оформляется на сайте, оплата при получении. Менеджер свяжется по телефону, когда заказ будет готов.</p>
            <Link to="/payment" className={styles.deliveryLink}>Подробнее о самовывозе</Link>
          </div>
        </section>

        {/* Related */}
        {product.show_related !== false && sameCategoryProducts.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.sectionHeading}>Рекомендуемые товары</h2>
            <div className={styles.relatedGrid}>
              {sameCategoryProducts.map((p) => <ProductCard key={p.id} product={p} showWishlist layout="grid" compact />)}
            </div>
            {product?.category_slug && <Link to={`/catalog?category=${product.category_slug}`} className={styles.categoryLink}>Все товары категории «{product.category_name}»</Link>}
          </section>
        )}

        {/* Mobile buy bar */}
        <div className={styles.mobileBuyBar}>
          <div className={styles.mobileBuyPrice}>
            <span className={styles.mobileBuyCurrent}>{formatPrice(effectivePrice)}</span>
            {oldPrice != null && <span className={styles.mobileBuyOld}>{formatPrice(oldPrice)}</span>}
          </div>
          {user ? (
            inCart ? (
              <div className={styles.mobileQty}>
                <button type="button" className={styles.mobileQtyBtn} onClick={handleDecrease}>−</button>
                <input type="text" inputMode="numeric" className={styles.mobileQtyVal} min={1} max={available} value={qtyFocused ? qtyInput : String(cartQty)} onChange={handleQtyChange} onFocus={handleQtyFocus} onBlur={handleQtyBlur} aria-label="Количество"/>
                <button type="button" className={styles.mobileQtyBtn} onClick={handleIncrease} disabled={cartQty >= available}>+</button>
              </div>
            ) : (
              <button type="button" className={styles.mobileBuyBtn} onClick={handleAddToCart} disabled={available <= 0}>В корзину</button>
            )
          ) : <Link to="/login" className={styles.mobileBuyBtn}>Войти</Link>}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {showShareModal && (
        <div className={styles.shareOverlay} onClick={() => setShowShareModal(false)} role="dialog" aria-modal="true">
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shareModalHead}><h2 className={styles.shareModalTitle}>Поделиться</h2><button type="button" className={styles.shareClose} onClick={() => setShowShareModal(false)}>&times;</button></div>
            <div className={styles.shareModalBody}>
              <div className={styles.shareCopyRow}><input type="text" className={styles.shareCopyInput} readOnly value={getShareUrl()}/><button type="button" className={styles.shareCopyBtn} onClick={handleCopyLink}>Скопировать</button></div>
              <div className={styles.shareIcons}>
                <button type="button" className={styles.shareIconBtn} onClick={handleCopyLink}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>Ссылка</span></button>
                <button type="button" className={styles.shareIconBtn} onClick={handleShareTelegram}><img src="/Img/Telegram_logo.svg" alt="" width={22} height={22}/><span>Telegram</span></button>
                <button type="button" className={styles.shareIconBtn} onClick={handleShareWhatsApp}><img src="/Img/WhatsApp.svg" alt="" width={22} height={22}/><span>WhatsApp</span></button>
                <button type="button" className={styles.shareIconBtn} onClick={handleShareInstagram}><img src="/Img/Instagram_logo_2022.svg" alt="" width={22} height={22}/><span>Instagram</span></button>
                <button type="button" className={styles.shareIconBtn} onClick={handleShareTikTok}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg><span>TikTok</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {zoomOpen && (
        <div className={styles.zoomOverlay} onClick={() => setZoomOpen(false)} role="dialog" aria-modal="true">
          <div className={styles.zoomModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.zoomClose} onClick={() => setZoomOpen(false)}>&times;</button>
            <img src={mainImageUrl} alt={product.name} className={styles.zoomImage}/>
          </div>
        </div>
      )}
    </main>
  );
}
