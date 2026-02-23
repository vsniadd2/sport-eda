import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCatalog from '../../components/ProductCatalog/ProductCatalog';
import ProductFilters from '../../components/ProductFilters/ProductFilters';
import styles from './Catalog.module.css';

const SEARCH_DEBOUNCE_MS = 400;

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const urlSearch = searchParams.get('search') || '';
  const priceMaxParam = searchParams.get('price_max');
  const priceMinParam = searchParams.get('price_min');
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [categories, setCategories] = useState([]);
  const debounceRef = useRef(null);

  const priceMin = priceMinParam != null && priceMinParam !== '' ? Number(priceMinParam) : null;
  const priceMax = priceMaxParam != null && priceMaxParam !== '' ? Number(priceMaxParam) : null;

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    fetch('/api/products/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleFilterChange = (slug) => {
    const next = new URLSearchParams(searchParams);
    if (slug) {
      next.set('category', slug);
    } else {
      next.delete('category');
    }
    next.delete('search');
    setSearchParams(next);
    setSearchInput('');
  };

  const handleCategorySelect = (slug) => {
    const next = new URLSearchParams(searchParams);
    next.set('category', slug);
    next.delete('search');
    setSearchParams(next);
    setSearchInput('');
  };

  const handleSearchChange = (q) => {
    setSearchInput(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const val = (q || '').trim();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (val) next.set('search', val);
        else next.delete('search');
        return next;
      });
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
  };

  const handlePriceChange = (minVal, maxVal) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (minVal != null && !Number.isNaN(minVal) && minVal > 0) next.set('price_min', String(minVal));
      else next.delete('price_min');
      if (maxVal != null && !Number.isNaN(maxVal) && maxVal < 2000) next.set('price_max', String(maxVal));
      else next.delete('price_max');
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput('');
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Каталог товаров</h1>
        <nav className={styles.breadcrumb}>
          <Link to="/">Главная</Link>
          <span className={styles.sep}>/</span>
          <span className={styles.breadcrumbCurrent}>Каталог товаров</span>
        </nav>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <ProductFilters
              categories={categories}
              selectedCategory={categoryParam || ''}
              onFilterChange={handleFilterChange}
              searchQuery={searchInput}
              onSearchChange={handleSearchChange}
              onCategorySelect={handleCategorySelect}
              priceMin={priceMin}
              priceMax={priceMax}
              onPriceChange={handlePriceChange}
              onReset={handleResetFilters}
            />
          </aside>
          <div className={styles.content}>
            <ProductCatalog />
          </div>
        </div>
      </div>
    </main>
  );
}
