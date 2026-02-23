import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { formatPrice } from '../../utils/formatPrice';
import Loader from '../Loader/Loader';
import styles from './SearchModal.module.css';

const DEBOUNCE_MS = 300;

// Страницы сайта для поиска (навигация)
const SITE_PAGES = [
  { title: 'Главная', path: '/', keywords: 'главная home' },
  { title: 'Каталог', path: '/catalog', keywords: 'каталог товары catalog' },
  { title: 'Самовывоз', path: '/payment', keywords: 'самовывоз оплата при получении' },
  { title: 'О нас', path: '/about', keywords: 'о нас about контакты' },
  { title: 'Карта сайта', path: '/sitemap', keywords: 'карта сайта sitemap навигация' },
];

function matchPage(page, q) {
  const lower = q.toLowerCase();
  return (
    page.title.toLowerCase().includes(lower) ||
    page.keywords.split(/\s+/).some((kw) => kw.toLowerCase().includes(lower) || lower.includes(kw.toLowerCase()))
  );
}

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const pageMatches = query.trim()
    ? SITE_PAGES.filter((p) => matchPage(p, query.trim()))
    : [];

  // Фокус на поле ввода при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Блокировка скролла
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Поиск с debounce
  const search = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults({ products: [], categories: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(trimmed)}&limit=10`);
      const data = await res.json();
      setResults({
        products: Array.isArray(data.products) ? data.products : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
      });
    } catch {
      setResults({ products: [], categories: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), DEBOUNCE_MS);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const handleProductClick = () => {
    onClose();
    setQuery('');
    setResults({ products: [], categories: [] });
  };

  const handleCategoryClick = () => {
    onClose();
    setQuery('');
    setResults({ products: [], categories: [] });
  };

  const handlePageClick = () => {
    onClose();
    setQuery('');
    setResults({ products: [], categories: [] });
  };

  if (!isOpen) return null;

  const hasResults = results.products.length > 0 || results.categories.length > 0 || pageMatches.length > 0;
  const showNoResults = query.trim() && !loading && !hasResults;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Поиск товаров, категорий, страниц, артикула..."
            className={styles.input}
            autoComplete="off"
          />
          <button type="submit" className={styles.searchBtn} aria-label="Найти">
            <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" fill="currentColor" />
            </svg>
          </button>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </form>

        <div className={styles.results}>
          {loading && (
            <div className={styles.loading}>
              <Loader size="small" />
            </div>
          )}

          {showNoResults && (
            <div className={styles.noResults}>
              По запросу «{query}» ничего не найдено
            </div>
          )}

          {!loading && pageMatches.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Страницы сайта</h3>
              <div className={styles.pagesList}>
                {pageMatches.map((page) => (
                  <Link
                    key={page.path}
                    to={page.path}
                    className={styles.pageItem}
                    onClick={handlePageClick}
                  >
                    <span>{page.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!loading && results.categories.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Категории</h3>
              <div className={styles.categoriesList}>
                {results.categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/catalog?category=${cat.slug}`}
                    className={styles.categoryItem}
                    onClick={handleCategoryClick}
                  >
                    {cat.has_image && (
                      <img
                        src={`/api/products/categories/${cat.id}/image`}
                        alt=""
                        className={styles.categoryImage}
                      />
                    )}
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!loading && results.products.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Товары</h3>
              <div className={styles.productsList}>
                {results.products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className={styles.productItem}
                    onClick={handleProductClick}
                  >
                    <div className={styles.productImage}>
                      {product.has_image ? (
                        <img src={`/api/products/${product.id}/image`} alt="" />
                      ) : (
                        <div className={styles.noImage}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={styles.productInfo}>
                      <div className={styles.productName}>{product.name}</div>
                      <div className={styles.productMeta}>
                        <span className={styles.productArticle}>Арт. {product.article}</span>
                        <span className={styles.productCategory}>{product.category_name}</span>
                      </div>
                      <div className={styles.productPrice}>
                        {product.is_sale && product.sale_price ? (
                          <>
                            <span className={styles.salePrice}>{formatPrice(product.sale_price)}</span>
                            <span className={styles.oldPrice}>{formatPrice(product.price)}</span>
                          </>
                        ) : (
                          <span>{formatPrice(product.price)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {query.trim() && !loading && (results.products.length > 0 || results.categories.length > 0) && (
            <Link
              to={`/catalog?search=${encodeURIComponent(query.trim())}`}
              className={styles.showAll}
              onClick={handleProductClick}
            >
              Показать все результаты в каталоге
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
