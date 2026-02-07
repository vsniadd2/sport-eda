import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';
import styles from './ProductCatalog.module.css';

const SORT_OPTIONS = [
  { value: '', label: 'по умолчанию' },
  { value: 'price_asc', label: 'цене: по возрастанию' },
  { value: 'price_desc', label: 'цене: по убыванию' },
  { value: 'name', label: 'названию' },
];

function sortProducts(list, sortBy) {
  if (!sortBy) return [...list];
  const arr = [...list];
  switch (sortBy) {
    case 'price_asc':
      return arr.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    case 'price_desc':
      return arr.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
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
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perPage, setPerPage] = useState(24);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const category = categoryFilter ?? '';
  useEffect(() => {
    setLoading(true);
    const url = new URL('/api/products', window.location.origin);
    if (category) url.searchParams.set('category', category);
    if (searchFilter.trim()) url.searchParams.set('search', searchFilter.trim());
    Promise.all([
      fetch('/api/products/categories').then((r) => r.json().catch(() => [])),
      fetch(url.toString()).then((r) => r.json().catch(() => [])),
    ])
      .then(([cats, prods]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        setProducts(Array.isArray(prods) ? prods : []);
      })
      .catch(() => {
        setCategories([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [category, searchFilter]);

  useEffect(() => {
    setPage(1);
  }, [category, searchFilter]);

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
      <section className={styles.section}>
        {loading && (
          <div className={styles.loadingBar}>
            <span>Загрузка...</span>
          </div>
        )}
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
            <div className={styles.sortWrap}>
              <span className={styles.sortLabel}>Сортировать по</span>
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value || 'default'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className={viewMode === 'list' ? styles.list : styles.grid}>
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} showWishlist layout={viewMode} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <span className={styles.pageInfo}>
              Стр. {currentPage} из {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Вперёд
            </button>
          </div>
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
