import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../../utils/formatPrice';
import Loader from '../Loader/Loader';
import styles from './ProductFilters.module.css';

const DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 10;

const PRICE_MAX = 2000;

export default function ProductFilters({
  categories,
  selectedCategory,
  onFilterChange,
  searchQuery = '',
  onSearchChange,
  onCategorySelect,
  priceMin = null,
  priceMax = null,
  onPriceChange,
  onReset,
}) {
  const [results, setResults] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  const navigate = useNavigate();

  const search = useCallback(async (q) => {
    const trimmed = (q || '').trim();
    if (!trimmed) {
      setResults({ products: [], categories: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(trimmed)}&limit=${SEARCH_LIMIT}`
      );
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

  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (!q) {
      setResults({ products: [], categories: [] });
      setDropdownOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(q);
      setDropdownOpen(true);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, search]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleInputChange = (e) => {
    onSearchChange?.(e.target.value);
  };

  const handleProductClick = (id) => {
    setDropdownOpen(false);
    navigate(`/product/${id}`);
  };

  const handleCategoryClick = (slug) => {
    setDropdownOpen(false);
    onCategorySelect?.(slug);
  };

  const handleShowAll = () => {
    setDropdownOpen(false);
  };

  const hasResults =
    results.products.length > 0 || results.categories.length > 0;
  const showDropdown =
    dropdownOpen &&
    (searchQuery || '').trim() &&
    (loading || hasResults);

  const categoryIcon = (
    <svg className={styles.categoriesIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
    </svg>
  );
  const chevronRight = (
    <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );

  return (
    <div className={styles.wrapper} ref={wrapRef}>
      <div className={styles.searchWrap}>
        <label
          className={`${styles.searchLabel} ${searchQuery.trim() ? styles.hasValue : ''}`}
        >
          <input
            type="text"
            placeholder="Поиск по названию, артикулу..."
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() =>
              (searchQuery || '').trim() && setDropdownOpen(true)
            }
            aria-label="Поиск по каталогу"
          />
          <kbd className={styles.slashIcon} aria-hidden>
            /
          </kbd>
          <span className={styles.searchIcon} aria-hidden>
            <svg
              width="18"
              height="18"
              viewBox="0 0 56.966 56.966"
              fill="currentColor"
              aria-hidden
            >
              <path d="M55.146 51.887 41.588 37.786A22.926 22.926 0 0 0 46.984 23c0-12.682-10.318-23-23-23s-23 10.318-23 23 10.318 23 23 23c4.761 0 9.298-1.436 13.177-4.162l13.661 14.208c.571.593 1.339.92 2.162.92.779 0 1.518-.297 2.079-.837a3.004 3.004 0 0 0 .083-4.242zM23.984 6c9.374 0 17 7.626 17 17s-7.626 17-17 17-17-7.626-17-17 7.626-17 17-17z" />
            </svg>
          </span>
        </label>

        {showDropdown && (
          <div className={styles.dropdown}>
            {loading && (
              <div className={styles.dropdownLoading}>
                <Loader size="small" />
              </div>
            )}
            {!loading && (searchQuery || '').trim() && !hasResults && (
              <div className={styles.dropdownNoResults}>
                По запросу «{searchQuery.trim()}» ничего не найдено
              </div>
            )}
            {!loading && results.categories.length > 0 && (
              <div className={styles.dropdownSection}>
                <h4 className={styles.dropdownSectionTitle}>Категории</h4>
                <div className={styles.dropdownCategories}>
                  {results.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={styles.dropdownCategoryBtn}
                      onClick={() => handleCategoryClick(cat.slug)}
                    >
                      {cat.has_image && (
                        <img
                          src={`/api/products/categories/${cat.id}/image`}
                          alt=""
                          className={styles.dropdownCategoryImg}
                        />
                      )}
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!loading && results.products.length > 0 && (
              <div className={styles.dropdownSection}>
                <h4 className={styles.dropdownSectionTitle}>Товары</h4>
                <ul className={styles.dropdownProducts}>
                  {results.products.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        className={styles.dropdownProductBtn}
                        onClick={() => handleProductClick(product.id)}
                      >
                        <div className={styles.dropdownProductImage}>
                          {product.has_image ? (
                            <img
                              src={`/api/products/${product.id}/image`}
                              alt=""
                            />
                          ) : (
                            <div className={styles.dropdownNoImage}>
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                />
                                <circle
                                  cx="8.5"
                                  cy="8.5"
                                  r="1.5"
                                />
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className={styles.dropdownProductInfo}>
                          <span className={styles.dropdownProductName}>
                            {product.name}
                          </span>
                          <span className={styles.dropdownProductMeta}>
                            Арт. {product.article}
                            {product.category_name && ` · ${product.category_name}`}
                          </span>
                          <span className={styles.dropdownProductPrice}>
                            {product.is_sale && product.sale_price ? (
                              <>
                                {formatPrice(product.sale_price)}{' '}
                                <span className={styles.dropdownOldPrice}>
                                  {formatPrice(product.price)}
                                </span>
                              </>
                            ) : (
                              formatPrice(product.price)
                            )}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!loading && hasResults && (
              <Link
                to={`/catalog?search=${encodeURIComponent((searchQuery || '').trim())}`}
                className={styles.dropdownShowAll}
                onClick={handleShowAll}
              >
                Показать все результаты в каталоге
              </Link>
            )}
          </div>
        )}
      </div>
      <h2 className={styles.categoriesTitle}>
        {categoryIcon}
        Категории
      </h2>
      <ul className={styles.categoryList}>
        <li>
          <button
            type="button"
            className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
            onClick={() => onFilterChange('')}
          >
            <span>Все товары</span>
            {chevronRight}
          </button>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              type="button"
              className={`${styles.categoryBtn} ${selectedCategory === cat.slug ? styles.active : ''}`}
              onClick={() => onFilterChange(cat.slug)}
            >
              <span>{cat.name}</span>
              {chevronRight}
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.priceFilter}>
        <h3 className={styles.priceFilterTitle}>Фильтр по цене</h3>
        <input
          type="range"
          className={styles.priceFilterRange}
          min={0}
          max={PRICE_MAX}
          value={priceMax != null && !Number.isNaN(priceMax) ? Number(priceMax) : PRICE_MAX}
          onChange={(e) => onPriceChange?.(priceMin, Number(e.target.value))}
          aria-label="Максимальная цена"
        />
        <div className={styles.priceFilterRow}>
          <div className={styles.priceFilterInputWrap}>
            <label className={styles.priceFilterInputLabel} htmlFor="price-min-input">от</label>
            <input
              id="price-min-input"
              type="number"
              min={0}
              max={PRICE_MAX}
              step={1}
              className={styles.priceFilterInput}
              value={priceMin != null && !Number.isNaN(priceMin) && priceMin > 0 ? Number(priceMin) : ''}
              placeholder="0"
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onPriceChange?.(null, priceMax != null && !Number.isNaN(priceMax) ? priceMax : PRICE_MAX);
                  return;
                }
                const v = parseInt(raw, 10);
                if (!Number.isNaN(v)) {
                  const clamped = Math.min(PRICE_MAX, Math.max(0, v));
                  onPriceChange?.(clamped, priceMax != null && !Number.isNaN(priceMax) ? priceMax : PRICE_MAX);
                }
              }}
              aria-label="Минимальная цена (ввести вручную)"
            />
            <span className={styles.priceFilterInputSuffix}>BYN</span>
          </div>
          <div className={styles.priceFilterInputWrap}>
            <label className={styles.priceFilterInputLabel} htmlFor="price-max-input">до</label>
            <input
              id="price-max-input"
              type="number"
              min={0}
              max={PRICE_MAX}
              step={1}
              className={styles.priceFilterInput}
              value={priceMax != null && !Number.isNaN(priceMax) ? Number(priceMax) : PRICE_MAX}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onPriceChange?.(priceMin, PRICE_MAX);
                  return;
                }
                const v = parseInt(raw, 10);
                if (!Number.isNaN(v)) {
                  const clamped = Math.min(PRICE_MAX, Math.max(0, v));
                  onPriceChange?.(priceMin != null && !Number.isNaN(priceMin) ? priceMin : null, clamped);
                }
              }}
              aria-label="Максимальная цена (ввести вручную)"
            />
            <span className={styles.priceFilterInputSuffix}>BYN</span>
          </div>
        </div>
        {onReset && (
          <button type="button" className={styles.resetBtn} onClick={onReset}>
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
