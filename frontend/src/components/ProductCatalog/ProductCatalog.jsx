import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import ProductCard from '../ProductCard/ProductCard';
import Loader from '../Loader/Loader';
import styles from './ProductCatalog.module.css';

const SORT_OPTIONS = [
  { value: '', label: 'По умолчанию' },
  { value: 'price_asc', label: 'По цене (возрастание)' },
  { value: 'price_desc', label: 'По цене (убывание)' },
  { value: 'name', label: 'По популярности' },
];

function effectivePrice(p) {
  if (p.is_sale && p.sale_price != null) return Number(p.sale_price) || 0;
  return Number(p.price) || 0;
}

function sortProducts(list, sortBy) {
  if (!sortBy) return [...list];
  const arr = [...list];
  switch (sortBy) {
    case 'price_asc':
      return arr.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case 'price_desc':
      return arr.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case 'name':
      return arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    default:
      return arr;
  }
}

export default function ProductCatalog({ limitPerCategory }) {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const searchFilter = searchParams.get('search') || '';
  const priceMinParam = searchParams.get('price_min');
  const priceMaxParam = searchParams.get('price_max');
  const saleFilter = searchParams.get('sale') === 'true';
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perPage, setPerPage] = useState(24);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const category = categoryFilter ?? '';
  const priceMin = priceMinParam != null && priceMinParam !== '' ? parseFloat(priceMinParam) : null;
  const priceMax = priceMaxParam != null && priceMaxParam !== '' ? parseFloat(priceMaxParam) : null;
  const sectionRef = useRef(null);
  const socketRef = useRef(null);
  const hasReceivedResultsRef = useRef(false);
  const sortDropdownRef = useRef(null);
  const [loadingSoft, setLoadingSoft] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  useEffect(() => {
    if (!sortDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) setSortDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortDropdownOpen]);

  // Категории один раз по HTTP
  useEffect(() => {
    fetch('/api/products/categories')
      .then((r) => r.json().catch(() => []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  // WebSocket: один сокет, по нему запрашиваем каталог при смене фильтров
  useEffect(() => {
    const s = io(window.location.origin);
    socketRef.current = s;
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Каталог на странице /catalog: загрузка по WebSocket (без скачка)
  useEffect(() => {
    if (limitPerCategory) return;
    if (!socketRef.current) return;

    if (!hasReceivedResultsRef.current) setLoading(true);
    else setLoadingSoft(true);

    const payload = {
      category: category || undefined,
      search: (searchFilter && searchFilter.trim()) || undefined,
      price_min: priceMin != null && !Number.isNaN(priceMin) ? priceMin : undefined,
      price_max: priceMax != null && !Number.isNaN(priceMax) ? priceMax : undefined,
      sale: saleFilter ? true : undefined,
    };
    socketRef.current.emit('catalog:query', payload);

    const onResults = (data) => {
      hasReceivedResultsRef.current = true;
      setProducts(Array.isArray(data.products) ? data.products : []);
      setLoading(false);
      setLoadingSoft(false);
    };
    socketRef.current.once('catalog:results', onResults);

    return () => {
      socketRef.current?.off('catalog:results', onResults);
    };
  }, [category, searchFilter, priceMin, priceMax, saleFilter, limitPerCategory]);

  // Блоки на главной и т.п.: загрузка по HTTP
  const fetchDataHttp = useCallback(() => {
    if (!limitPerCategory) return;
    setLoading(true);
    const url = new URL('/api/products', window.location.origin);
    if (category) url.searchParams.set('category', category);
    if (searchFilter.trim()) url.searchParams.set('search', searchFilter.trim());
    if (priceMin != null && !Number.isNaN(priceMin)) url.searchParams.set('price_min', String(priceMin));
    if (priceMax != null && !Number.isNaN(priceMax)) url.searchParams.set('price_max', String(priceMax));
    if (saleFilter) url.searchParams.set('sale', 'true');
    fetch(url.toString())
      .then((r) => r.json().catch(() => []))
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [limitPerCategory, category, searchFilter, priceMin, priceMax, saleFilter]);

  useEffect(() => {
    if (limitPerCategory) fetchDataHttp();
  }, [fetchDataHttp]);

  // При изменении товаров в админке — перезапросить текущий каталог по WS
  useEffect(() => {
    const s = socketRef.current;
    if (!s || limitPerCategory) return;
    const onChanged = () => {
      s.emit('catalog:query', {
        category: category || undefined,
        search: (searchFilter && searchFilter.trim()) || undefined,
        price_min: priceMin != null && !Number.isNaN(priceMin) ? priceMin : undefined,
        price_max: priceMax != null && !Number.isNaN(priceMax) ? priceMax : undefined,
        sale: saleFilter ? true : undefined,
      });
    };
    s.on('productsChanged', onChanged);
    return () => s.off('productsChanged', onChanged);
  }, [category, searchFilter, priceMin, priceMax, saleFilter, limitPerCategory]);

  useEffect(() => {
    setPage(1);
  }, [category, searchFilter, priceMin, priceMax, saleFilter]);

  const filteredCategories = category
    ? categories.filter((c) => c.slug === category)
    : categories;
  const productsByCategory = filteredCategories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const isCatalogPage = !limitPerCategory;
  const sortedProducts = useMemo(() => sortProducts(products, sortBy), [products, sortBy]);
  const total = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);
  const displayProducts = useMemo(
    () => sortedProducts.slice((currentPage - 1) * perPage, currentPage * perPage),
    [sortedProducts, currentPage, perPage]
  );

  if (isCatalogPage) {
    return (
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.catalogHeader}>
          <div>
            <h1 className={styles.catalogTitle}>
              {saleFilter ? 'Акции' : 'Каталог товаров'}
            </h1>
            <p className={styles.catalogSubtitle}>
              {saleFilter ? 'Товары по специальным ценам' : 'Спортивное питание и добавки для ваших достижений'}
            </p>
            <nav className={styles.catalogTabs} aria-label="Режим каталога">
              <Link to="/catalog" className={!saleFilter ? styles.catalogTabActive : styles.catalogTab}>Каталог</Link>
              <Link to="/catalog?sale=true" className={saleFilter ? styles.catalogTabActive : styles.catalogTab}>Акции</Link>
            </nav>
          </div>
          <div className={styles.sortBlock} ref={sortDropdownRef}>
            <span className={styles.sortLabelTop}>Сортировка</span>
            <div className={`${styles.sortDropdown} ${sortDropdownOpen ? styles.sortDropdownOpen : ''}`}>
              <button
                type="button"
                id="catalog-sort"
                className={styles.sortSelect}
                onClick={() => setSortDropdownOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={sortDropdownOpen}
                aria-label="Сортировка"
              >
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'По умолчанию'}
                <svg className={styles.sortSelectChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {sortDropdownOpen && (
                <ul
                  className={styles.sortDropdownList}
                  role="listbox"
                  aria-labelledby="catalog-sort"
                >
                  {SORT_OPTIONS.map((opt, index) => (
                    <li key={opt.value || 'default'}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={sortBy === opt.value}
                        className={`${styles.sortDropdownOption} ${sortBy === opt.value ? styles.sortDropdownOptionActive : ''}`}
                        onClick={() => {
                          setSortBy(opt.value);
                          setPage(1);
                          setSortDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        {loading && products.length === 0 && (
          <Loader wrap />
        )}
        {!(loading && products.length === 0) && (
        <div className={styles.toolbar}>
          <span className={styles.toolbarText}>
            Отображение {from}-{to} из {total}
          </span>
          <div className={styles.toolbarRight}>
            <span className={styles.showLabel}>Показать</span>
            {[24, 48, 96].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.perPageBtn} ${perPage === n ? styles.perPageActive : ''}`}
                onClick={() => { setPerPage(n); setPage(1); }}
              >
                {n}
              </button>
            ))}
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewActive : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Сетка"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewActive : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="Список"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
        )}
          {(loading && products.length === 0) ? null : (
          <div className={`${styles.gridWrap} ${loadingSoft ? styles.gridWrapSoft : ''}`}>
            {loadingSoft && <div className={styles.softIndicator} aria-hidden>Обновление…</div>}
            <div className={viewMode === 'list' ? styles.list : styles.grid}>
              {displayProducts.map((product) => (
                <ProductCard key={product.id} product={product} showWishlist showAvailability layout={viewMode} compact={viewMode === 'grid'} variant="catalog" />
              ))}
            </div>
          </div>
        )}
        {!(loading && products.length === 0) && totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Пагинация">
            <button
              type="button"
              className={styles.pageNavBtn}
              disabled={currentPage <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              aria-label="Предыдущая страница"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            {(() => {
              const items = [];
              const add = (from, to) => { for (let i = from; i <= to; i++) items.push({ type: 'page', value: i }); };
              if (totalPages <= 7) {
                add(1, totalPages);
              } else {
                add(1, 1);
                if (currentPage > 3) items.push({ type: 'ellipsis' });
                add(Math.max(2, currentPage - 1), Math.min(totalPages - 1, currentPage + 1));
                if (currentPage < totalPages - 2) items.push({ type: 'ellipsis' });
                if (totalPages > 1) add(totalPages, totalPages);
              }
              return items.map((item, idx) => {
                if (item.type === 'ellipsis') {
                  return <span key={`e-${idx}`} className={styles.pageEllipsis}>...</span>;
                }
                const p = item.value;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.pageNumBtn} ${p === currentPage ? styles.pageNumActive : ''}`}
                    onClick={() => {
                      setPage(p);
                      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {p}
                  </button>
                );
              });
            })()}
            <button
              type="button"
              className={styles.pageNavBtn}
              disabled={currentPage >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              aria-label="Следующая страница"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </nav>
        )}
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <p className={styles.slogan}>Интернет-магазин спортивного и здорового питания</p>
        {productsByCategory.map((cat) => {
          const items = limitPerCategory ? cat.products.slice(0, limitPerCategory) : cat.products;
          if (items.length === 0) return null;
          return (
            <div key={cat.id} className={styles.categoryBlock}>
              <div className={styles.categoryHeader}>
                <h2 className={styles.categoryTitle}>{cat.name}</h2>
                {category && (
                  <Link to="/catalog" className={styles.allLink}>Весь каталог</Link>
                )}
                {!category && limitPerCategory && cat.products.length > limitPerCategory && (
                  <Link to={`/catalog?category=${cat.slug}`} className={styles.allLink}>Все товары</Link>
                )}
              </div>
              <div className={styles.grid}>
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} showTag={false} showAvailability />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
