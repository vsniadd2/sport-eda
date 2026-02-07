import styles from './ProductFilters.module.css';

export default function ProductFilters({ categories, selectedCategory, onFilterChange, searchQuery = '', onSearchChange }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.searchWrap}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Поиск по каталогу..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
        <span className={styles.searchIcon} aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </span>
      </div>
      <h3 className={styles.categoriesTitle}>КАТЕГОРИИ</h3>
      <div className={styles.line} />
      <ul className={styles.categoryList}>
        <li>
          <button
            type="button"
            className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
            onClick={() => onFilterChange('')}
          >
            Все товары
          </button>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              type="button"
              className={`${styles.categoryBtn} ${selectedCategory === cat.slug ? styles.active : ''}`}
              onClick={() => onFilterChange(cat.slug)}
            >
              {cat.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
