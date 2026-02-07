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
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [categories, setCategories] = useState([]);
  const debounceRef = useRef(null);

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
    setSearchParams(next);
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

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Каталог</h1>
        <nav className={styles.breadcrumb}>
          <Link to="/">ГЛАВНАЯ</Link>
          <span className={styles.sep}> &gt; </span>
          <span>КАТАЛОГ</span>
        </nav>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <ProductFilters
              categories={categories}
              selectedCategory={categoryParam || ''}
              onFilterChange={handleFilterChange}
              searchQuery={searchInput}
              onSearchChange={handleSearchChange}
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
