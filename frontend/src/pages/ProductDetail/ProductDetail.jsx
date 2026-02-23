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
  const [activeSection, setActiveSection] = useState('about');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [qtyFocused, setQtyFocused] = useState(false);
  const [qtyInput, setQtyInput] = useState('');
  const reviewListRef = useRef(null);
  const aboutRef = useRef(null);
  const deliveryRef = useRef(null);

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

  const overallRatingPercent = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
    const avg = sum / reviews.length;
    return Math.min(100, Math.round(avg * 20));
  }, [reviews]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    setSelectedThumb(0);
  }, [productId]);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setZoomOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen]);

  useEffect(() => {
    if (!showShareModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowShareModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showShareModal]);

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
        setReviewsPage(1);
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
    const els = [aboutRef.current, reviewListRef.current, deliveryRef.current].filter(Boolean);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        const id = visible?.target?.getAttribute?.('data-section-id');
        if (id) setActiveSection(id);
      },
      { root: null, threshold: [0.2, 0.35, 0.5, 0.65] }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [productId, loading]);

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

  const available = product?.quantity ?? 0;

  const handleAddToCart = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!product) return;
    if (available <= 0) {
      notify('Товар недоступен', 'info');
      return;
    }
    if (cartQty >= available) {
      notify(`В корзину нельзя добавить больше ${available} шт.`, 'info');
      return;
    }
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
    if (cartQty >= available) {
      notify(`В корзину нельзя добавить больше ${available} шт.`, 'info');
      return;
    }
    const priceToUse = (product.is_sale && product.sale_price != null) ? parseFloat(product.sale_price) : parseFloat(product.price);
    addItem(product.id, 1, priceToUse, product.name);
  };

  const handleDecrease = () => {
    if (!product?.id) return;
    if (cartQty > 1) {
      updateQuantity(product.id, cartQty - 1);
    } else {
      updateQuantity(product.id, 0);
    }
  };

  const handleQtyFocus = () => {
    setQtyFocused(true);
    setQtyInput(String(cartQty));
  };

  const handleQtyChange = (e) => {
    setQtyInput(e.target.value.replace(/\D/g, ''));
  };

  const handleQtyBlur = () => {
    const n = parseInt(qtyInput, 10);
    const val = (Number.isNaN(n) || n < 1) ? 1 : Math.min(available, n);
    updateQuantity(product.id, val);
    setQtyFocused(false);
  };

  const getShareUrl = () => window.location.href;

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      notify('Ссылка скопирована', 'info');
      setShowShareModal(false);
    } catch {
      notify('Не удалось скопировать', 'error');
    }
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}`, '_blank', 'noopener,noreferrer');
    setShowShareModal(false);
  };

  const handleShareWhatsApp = () => {
    const text = product?.name ? `${product.name} ${getShareUrl()}` : getShareUrl();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setShowShareModal(false);
  };

  const handleShareInstagram = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      notify('Ссылка скопирована — вставьте в Instagram', 'info');
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    } catch {
      notify('Не удалось скопировать', 'error');
    }
  };

  const handleShareTikTok = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      notify('Ссылка скопирована — вставьте в TikTok', 'info');
      window.open('https://www.tiktok.com/', '_blank', 'noopener,noreferrer');
    } catch {
      notify('Не удалось скопировать', 'error');
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
        body: JSON.stringify({
          rating: reviewForm.rating,
          rating_quality: reviewForm.rating,
          rating_convenience: reviewForm.rating,
          text: reviewForm.text || null,
        }),
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
      setReviewsPage(1);
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
      setReviewsPage(1);
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
    setReviewForm({
      rating: myReview.rating ?? 5,
      text: myReview.text || '',
    });
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
            <div className={styles.errorIcon} aria-hidden>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
              </svg>
            </div>
            <h1 className={styles.errorTitle}>Товар не найден</h1>
            <p className={styles.errorText}>
              {error && error !== 'Товар не найден' ? error : 'Такого товара нет в каталоге или ссылка устарела.'}
            </p>
            <Link to="/catalog" className={styles.backLink}>Вернуться в каталог</Link>
          </div>
        </div>
      </main>
    );
  }

  const imageCount = product.has_image
    ? (product.image_count > 0 ? Math.min(4, product.image_count) : 1)
    : 0;
  const imageUrls = imageCount > 0
    ? Array.from({ length: imageCount }, (_, i) => `/api/products/${product.id}/images/${i}`)
    : [];
  const mainImageUrl = imageUrls[selectedThumb] || (product.has_image ? `/api/products/${product.id}/image` : (product.image_url?.startsWith('http') ? product.image_url : PLACEHOLDER));
  const canCycleImages = imageUrls.length > 1;

  const goPrevImage = () => {
    setSelectedThumb((t) => (t - 1 + imageUrls.length) % imageUrls.length);
  };
  const goNextImage = () => {
    setSelectedThumb((t) => (t + 1) % imageUrls.length);
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const inFavorites = isFavorite(product.id);
  const showSalePrice = product.is_sale && product.sale_price != null;
  const effectivePrice = showSalePrice ? parseFloat(product.sale_price) : parseFloat(product.price);
  const oldPrice = showSalePrice ? product.price : null;

  const scrollToSection = (ref, id) => {
    if (!ref?.current) return;
    setActiveSection(id);
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Хлебные крошки (1.txt: chevron_right между пунктами) */}
        <div className={styles.topBar}>
          <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </span>
            <Link to="/catalog">Каталог</Link>
            {product.category_name && (
              <>
                <span className={styles.breadcrumbSep} aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </span>
                <Link to={`/catalog?category=${product.category_slug || ''}`}>{product.category_name}</Link>
              </>
            )}
            <span className={styles.breadcrumbSep} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </span>
            <span className={styles.breadcrumbCurrent}>{product.name}</span>
          </nav>
          <div className={styles.topActions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnFavorite} ${inFavorites ? styles.actionBtnActive : ''}`}
              onClick={() => toggleFavorite(product.id)}
              aria-label={inFavorites ? 'Убрать из избранного' : 'В избранное'}
            >
              <span className={styles.actionBtnIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </span>
              <span className={styles.actionBtnLabel}>{inFavorites ? 'В избранном' : 'В избранное'}</span>
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnShare}`}
              onClick={() => setShowShareModal(true)}
              aria-label="Поделиться"
            >
              <span className={styles.actionBtnIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </span>
              <span className={styles.actionBtnLabel}>Поделиться</span>
            </button>
          </div>
        </div>

        {/* 999: две колонки 7+5 — галерея с миниатюрами | инфо+цена+корзина */}
        <div className={styles.productLayout}>
          <div className={styles.gallery}>
            <div className={styles.galleryMain}>
              <div className={styles.imageWrap}>
                {canCycleImages && (
                  <button type="button" className={styles.galleryArrow + ' ' + styles.galleryArrowPrev} onClick={goPrevImage} aria-label="Предыдущее фото">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                )}
                <button type="button" className={styles.imageBtn} onClick={() => setZoomOpen(true)} aria-label="Открыть изображение крупно">
                  <img src={mainImageUrl} alt={product.name} className={styles.mainImage} loading="eager" decoding="async" />
                </button>
                {canCycleImages && (
                  <button type="button" className={styles.galleryArrow + ' ' + styles.galleryArrowNext} onClick={goNextImage} aria-label="Следующее фото">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.favoriteOverlay} ${styles.favoriteOverlayBtn}`}
                  onClick={() => toggleFavorite(product.id)}
                  aria-label={inFavorites ? 'Убрать из избранного' : 'В избранное'}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={inFavorites ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
                {(product.is_sale || product.is_hit || product.is_recommended) && (
                  <div className={styles.badges}>
                    {product.is_sale && <span className={styles.badgeSale}>Акция</span>}
                    {product.is_hit && <span className={styles.badgeHit}>Хит</span>}
                    {product.is_recommended && <span className={styles.badgeRec}>Советуем</span>}
                  </div>
                )}
              </div>
            </div>
            {imageUrls.length > 0 && (
              <div className={styles.thumbnails}>
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.thumbnail} ${selectedThumb === i ? styles.thumbnailActive : ''}`}
                    onClick={() => setSelectedThumb(i)}
                    aria-label={`Миниатюра ${i + 1}`}
                  >
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
            {product.description && (
              <div className={styles.galleryDescription}>
                <h3 className={styles.galleryDescriptionTitle}>Подробное описание</h3>
                <p className={styles.galleryDescriptionText}>{product.description}</p>
              </div>
            )}
          </div>

          {/* Правая колонка: теги, название, рейтинг, цена, ряд qty+корзина, trust */}
          <div className={styles.info}>
            {(product.is_sale || product.is_hit || product.is_recommended) && (
              <div className={styles.tagsRow}>
                {product.is_sale && <span className={styles.tagBadge}>Акция</span>}
                {product.is_hit && <span className={styles.tagBadge}>Хит</span>}
                {product.is_recommended && <span className={styles.tagBadge}>Рекомендуем</span>}
              </div>
            )}
            {product.manufacturer && (
              <div className={styles.brandRow}>
                <span className={styles.brand}>{product.manufacturer}</span>
                <span className={styles.originalBadge}>Оригинал</span>
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
                <span className={styles.ratingCount}>({reviews.length} {reviews.length === 1 ? 'отзыв' : reviews.length < 5 ? 'отзыва' : 'отзывов'})</span>
              </button>
            )}

            {(product.short_description || product.description) && (
              <p className={styles.leadDescription}>{product.short_description || product.description}</p>
            )}

            {(() => {
              const badges = Array.isArray(product.trust_badges) && product.trust_badges.length > 0
                ? product.trust_badges
                : ['Лабораторно проверено', 'Гарантия качества', '100% Оригинал'];
              return (
                <div className={styles.trustBadges}>
                  {badges.map((text, i) => (
                    <span key={i} className={styles.trustBadge}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      {text}
                    </span>
                  ))}
                </div>
              );
            })()}

            <div className={styles.priceCard}>
              <div className={styles.priceRow}>
                <span className={styles.priceCurrent}>{formatPrice(effectivePrice)}</span>
                {oldPrice != null && (
                  <>
                    <span className={styles.priceOld}>{formatPrice(oldPrice)}</span>
                    <span className={styles.discountBadge}>
                      Скидка {Math.round((1 - effectivePrice / parseFloat(oldPrice)) * 100)}%
                    </span>
                  </>
                )}
              </div>
              <div className={styles.addToCartRow}>
                {user && inCart ? (
                  <div className={styles.quantityControl} role="group" aria-label="Количество">
                    <button type="button" className={styles.qtyBtn} onClick={handleDecrease} aria-label="Уменьшить">−</button>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.qtyValue}
                      min={1}
                      max={available}
                      value={qtyFocused ? qtyInput : String(cartQty)}
                      onChange={handleQtyChange}
                      onFocus={handleQtyFocus}
                      onBlur={handleQtyBlur}
                      aria-label="Количество"
                    />
                    <button type="button" className={styles.qtyBtn} onClick={handleIncrease} aria-label="Увеличить" disabled={cartQty >= available}>+</button>
                  </div>
                ) : null}
                {user ? (
                  <button type="button" className={styles.btnAddCart} onClick={handleAddToCart} disabled={available <= 0}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></svg>
                    В корзину
                  </button>
                ) : (
                  <Link to="/login" className={styles.btnAddCart + ' ' + styles.btnAddCartLink}>
                    Войдите, чтобы купить
                  </Link>
                )}
              </div>
            </div>

            <Link to="/cart" className={styles.btnBuyNow}>
              Перейти в корзину
            </Link>

            <div className={styles.deliveryInfo}>
              <div className={styles.deliveryItem}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Гарантируем качество</span>
              </div>
              <div className={styles.deliveryItem}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>100% Оригинал</span>
              </div>
              <div className={styles.deliveryItem}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span>Безопасная оплата</span>
              </div>
            </div>

            {specItems.length > 0 && (
              <div className={styles.specBlock}>
                <h3 className={styles.specBlockTitle}>Характеристики</h3>
                <dl className={styles.specList}>
                  {specItems.map((item) => (
                    <div key={item.label} className={styles.specRow}>
                      <dt className={styles.specLabel}>{item.label}</dt>
                      <dd className={styles.specValue}>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* Табы + описание/характеристики */}
        <div className={styles.sectionTabs}>
          <button
            type="button"
            className={activeSection === 'about' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => scrollToSection(aboutRef, 'about')}
          >
            О продукте
          </button>
          <button
            type="button"
            className={activeSection === 'reviews' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => scrollToSection(reviewListRef, 'reviews')}
          >
            Отзывы{reviews.length > 0 ? ` (${reviews.length})` : ''}
          </button>
          <button
            type="button"
            className={activeSection === 'delivery' ? styles.tabBtnActive : styles.tabBtn}
            onClick={() => scrollToSection(deliveryRef, 'delivery')}
          >
            Доставка и оплата
          </button>
        </div>

        <section ref={aboutRef} data-section-id="about" className={styles.detailsSection}>
          <h2 className={styles.sectionTitle}>О продукте</h2>
          <div className={styles.detailsGrid}>
            <div>
              {product.description ? (
                <>
                  <p className={styles.detailsText}>{product.description}</p>
                  <ul className={styles.detailsList}>
                    <li>Проверьте состав и рекомендации по применению.</li>
                    <li>Смотрите отзывы покупателей — это помогает выбрать.</li>
                    <li><Link to="/payment">Самовывоз и оплата</Link> — на отдельной странице.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className={styles.detailsTextMuted}>Описание пока не добавлено.</p>
                  <ul className={styles.detailsList}>
                    <li>Смотрите отзывы покупателей.</li>
                    <li><Link to="/payment">Самовывоз и оплата</Link>.</li>
                  </ul>
                </>
              )}
              {product.show_how_to_use !== false && (
                <div className={styles.howToUse}>
                  <h4 className={styles.howToUseTitle}>Как использовать</h4>
                  <p className={styles.howToUseIntro}>
                    {product.how_to_use_intro || 'Для лучшего результата следуйте рекомендациям производителя.'}
                  </p>
                  <div className={styles.howToUseSteps}>
                    <div className={styles.howToUseStep}>
                      <span className={styles.howToUseStepNum}>1</span>
                      <p className={styles.howToUseStepText}>{product.how_to_use_step1 || 'Принимайте добавку в соответствии с инструкцией на упаковке.'}</p>
                    </div>
                    <div className={styles.howToUseStep}>
                      <span className={styles.howToUseStepNum}>2</span>
                      <p className={styles.howToUseStepText}>{product.how_to_use_step2 || 'Храните в сухом месте, берегите от прямых солнечных лучей.'}</p>
                    </div>
                    <div className={styles.howToUseStep}>
                      <span className={styles.howToUseStepNum}>3</span>
                      <p className={styles.howToUseStepText}>{product.how_to_use_step3 || 'Перед применением проконсультируйтесь со специалистом при необходимости.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.ratingsCard}>
              <div className={styles.ratingsCardHeader}>
                <h3 className={styles.ratingsCardTitle}>Рейтинг и отзывы</h3>
                <span className={styles.ratingsCardBadge}>
                  {reviews.length === 0 ? 'Нет отзывов' : `${reviews.length} ${reviews.length === 1 ? 'отзыв' : reviews.length < 5 ? 'отзыва' : 'отзывов'}`}
                </span>
              </div>
              <div className={styles.ratingBarRow}>
                <div className={styles.ratingBarLabel}>
                  <span>Общий рейтинг</span>
                  <span>{overallRatingPercent}%</span>
                </div>
                <div className={styles.ratingBarTrack}>
                  <div className={styles.ratingBarFill} style={{ width: `${overallRatingPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Отзывы (1.txt: Customer Feedback + Write a Review) */}
        <section ref={reviewListRef} data-section-id="reviews" className={styles.reviewsSection}>
          <div className={styles.reviewsSectionHeader}>
            <div>
              <h2 className={styles.sectionTitle + ' ' + styles.reviewsSectionHeaderTitle}>Оценки покупателей</h2>
              {reviews.length > 0 && (
                <div className={styles.reviewsSectionHeaderScore}>
                  <span className={styles.ratingStars} aria-hidden>{'★'.repeat(Math.round(parseFloat(avgRating)))}{'☆'.repeat(5 - Math.round(parseFloat(avgRating) || 0))}</span>
                  <span className={styles.ratingValue}>{avgRating || '0'} из 5</span>
                </div>
              )}
            </div>
            {(user && (canReview || myReview)) && (
              <button
                type="button"
                className={styles.reviewsWriteBtn}
                onClick={() => document.getElementById('review-form-wrap')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Написать отзыв
              </button>
            )}
          </div>
          {reviews.length === 0 ? (
            <p className={styles.noReviews}>Пока нет отзывов. Будьте первым, кто оставит отзыв.</p>
          ) : (
            <div className={styles.reviewsLayout}>
              <div className={styles.reviewsSummary}>
                <h3 className={styles.reviewsSummaryScore}>{avgRating || '0'}</h3>
                <div className={styles.reviewsSummaryStars}>
                  {'★'.repeat(Math.round(parseFloat(avgRating) || 0))}{'☆'.repeat(5 - Math.round(parseFloat(avgRating) || 0))}
                </div>
                <p className={styles.reviewsSummaryCount}>На основе {reviews.length} проверенных отзывов</p>
                <div className={styles.reviewDist}>
                  {[5, 4, 3, 2, 1].map((star, i) => (
                    <div key={star} className={styles.reviewDistRow}>
                      <span className={styles.reviewDistLabel}>{star}</span>
                      <div className={styles.reviewDistTrack}>
                        <div className={styles.reviewDistFill} style={{ width: `${reviewDistribution[i]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.reviewsListCol}>
                {(() => {
                  const totalReviewPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
                  const currentPage = Math.min(reviewsPage, totalReviewPages);
                  const displayReviews = reviews.slice((currentPage - 1) * REVIEWS_PER_PAGE, currentPage * REVIEWS_PER_PAGE);
                  return (
                    <>
                      <div className={styles.reviewList}>
                        {displayReviews.map((r) => {
                          const name = r.username || 'Покупатель';
                          const initials = name.split(/\s+/).map((s) => s[0]).join('').toUpperCase().slice(0, 2) || '?';
                          return (
                          <div key={r.id} className={styles.reviewCard}>
                            <div className={styles.reviewHead}>
                              <div className={styles.reviewUserRow}>
                                <span className={styles.reviewAvatar} aria-hidden>{initials}</span>
                                <div>
                                  <p className={styles.reviewUser}>{name}</p>
                                  <div className={styles.reviewStars}>{'★'.repeat(r.rating || 0)}{'☆'.repeat(5 - (r.rating || 0))}</div>
                                </div>
                              </div>
                              <span className={styles.reviewVerified}>Проверенный покупатель</span>
                            </div>
                            <span className={styles.reviewDate}>{r.created_at ? formatDate(r.created_at) : ''}</span>
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
                          );
                        })}
                      </div>
                      {totalReviewPages > 1 && (
                        <div className={styles.reviewsPagination}>
                          {currentPage > 1 && (
                            <button type="button" className={styles.reviewsPageBtn} onClick={() => setReviewsPage((p) => p - 1)}>
                              Предыдущая
                            </button>
                          )}
                          <span className={styles.reviewsPageInfo}>
                            Страница {currentPage} из {totalReviewPages}
                          </span>
                          {currentPage < totalReviewPages && (
                            <button type="button" className={styles.loadMoreReviewsBtn} onClick={() => setReviewsPage((p) => p + 1)}>
                              Загрузить ещё отзывы
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          {user && (editingMyReview || (canReview && !myReview)) && (
            <div id="review-form-wrap" className={styles.reviewFormWrap}>
              <h3 className={styles.reviewFormTitle}>{editingMyReview ? 'Редактировать отзыв' : 'Оставить отзыв'}</h3>
              <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                {reviewError && <div className={styles.reviewError}>{reviewError}</div>}
                <div className={styles.reviewRatingBlock}>
                  <span className={styles.reviewRatingLabel}>Оценка</span>
                  <div className={styles.ratingStarsInput} role="group" aria-label="Оценка">
                    {[5, 4, 3, 2, 1].flatMap((n) => [
                      <input
                        key={`star-${n}`}
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
                  Отзыв
                  <textarea
                    className={styles.reviewTextarea}
                    placeholder="Поделитесь впечатлениями о товаре"
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm((f) => ({ ...f, text: e.target.value }))}
                    rows={3}
                    onInput={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                    onFocus={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
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

        {/* Доставка и оплата */}
        <section ref={deliveryRef} data-section-id="delivery" className={styles.deliverySection}>
          <h2 className={styles.sectionTitle}>Самовывоз и оплата</h2>
          <div className={styles.deliveryGrid}>
            <div className={styles.deliveryCard}>
              <h3 className={styles.deliveryTitle}>Самовывоз</h3>
              <p className={styles.deliveryText}>Заказ оформляется на сайте, оплата при получении. Менеджер свяжется по телефону, когда заказ будет готов.</p>
              <Link to="/payment" className={styles.deliveryLink}>Подробнее о самовывозе</Link>
            </div>
          </div>
        </section>

        {/* Рекомендуемые товары */}
        {product.show_related !== false && sameCategoryProducts.length > 0 && (
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

        {/* Mobile sticky buy bar */}
        <div className={styles.mobileBuyBar}>
          <div className={styles.mobileBuyPrice}>
            <span className={styles.mobileBuyCurrent}>{formatPrice(effectivePrice)}</span>
            {oldPrice != null && <span className={styles.mobileBuyOld}>{formatPrice(oldPrice)}</span>}
          </div>
          {user ? (
            inCart ? (
              <div className={styles.mobileQty} role="group" aria-label="Количество">
                <button type="button" className={styles.mobileQtyBtn} onClick={handleDecrease} aria-label="Уменьшить">−</button>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.mobileQtyValue}
                  min={1}
                  max={available}
                  value={qtyFocused ? qtyInput : String(cartQty)}
                  onChange={handleQtyChange}
                  onFocus={handleQtyFocus}
                  onBlur={handleQtyBlur}
                  aria-label="Количество"
                />
                <button type="button" className={styles.mobileQtyBtn} onClick={handleIncrease} aria-label="Увеличить" disabled={cartQty >= available}>+</button>
              </div>
            ) : (
              <button type="button" className={styles.mobileBuyBtn} onClick={handleAddToCart} disabled={available <= 0}>В корзину</button>
            )
          ) : (
            <Link to="/login" className={styles.mobileBuyBtn}>Войти</Link>
          )}
        </div>
      </div>

      {showShareModal && (
        <div className={styles.shareOverlay} onClick={() => setShowShareModal(false)} role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shareModalHeader}>
              <h2 id="share-modal-title" className={styles.shareModalTitle}>Поделиться</h2>
              <button type="button" className={styles.shareModalClose} onClick={() => setShowShareModal(false)} aria-label="Закрыть">×</button>
            </div>
            <div className={styles.shareModalBody}>
              <p className={styles.shareCopyLabel}>Или скопировать ссылку</p>
              <div className={styles.shareCopyRow}>
                <input type="text" className={styles.shareCopyInput} readOnly value={getShareUrl()} aria-label="Ссылка для копирования" />
                <button type="button" className={styles.shareCopyBtn} onClick={handleCopyLink}>Скопировать</button>
              </div>
              <div className={styles.shareModalActions}>
                <button type="button" className={styles.shareActionBtn} onClick={handleCopyLink} title="Скопировать ссылку">
                  <span className={styles.shareActionIcon} aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </span>
                  <span className={styles.shareActionLabel}>Copy</span>
                </button>
                <button type="button" className={styles.shareActionBtn} onClick={handleShareTelegram} title="Telegram">
                  <span className={styles.shareActionIcon} aria-hidden>
                    <img src="/Img/Telegram_logo.svg" alt="" width={24} height={24} />
                  </span>
                  <span className={styles.shareActionLabel}>Telegram</span>
                </button>
                <button type="button" className={styles.shareActionBtn} onClick={handleShareWhatsApp} title="WhatsApp">
                  <span className={styles.shareActionIcon} aria-hidden>
                    <img src="/Img/WhatsApp.svg" alt="" width={24} height={24} />
                  </span>
                  <span className={styles.shareActionLabel}>WhatsApp</span>
                </button>
                <button type="button" className={styles.shareActionBtn} onClick={handleShareInstagram} title="Instagram">
                  <span className={styles.shareActionIcon} aria-hidden>
                    <img src="/Img/Instagram_logo_2022.svg" alt="" width={24} height={24} />
                  </span>
                  <span className={styles.shareActionLabel}>Instagram</span>
                </button>
                <button type="button" className={styles.shareActionBtn} onClick={handleShareTikTok} title="TikTok">
                  <span className={styles.shareActionIcon} aria-hidden>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                  </span>
                  <span className={styles.shareActionLabel}>TikTok</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {zoomOpen && (
        <div className={styles.zoomOverlay} onClick={() => setZoomOpen(false)} role="dialog" aria-modal="true">
          <div className={styles.zoomModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.zoomClose} onClick={() => setZoomOpen(false)} aria-label="Закрыть">×</button>
            <img src={mainImageUrl} alt={product.name} className={styles.zoomImage} />
          </div>
        </div>
      )}
    </main>
  );
}
