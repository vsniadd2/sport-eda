import styles from './ProductFilters.module.css';

export default function ProductFilters({ categories, selectedCategory, onFilterChange, searchQuery = '', onSearchChange }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.searchWrap}>
        <label className={`${styles.searchLabel} ${searchQuery.trim() ? styles.hasValue : ''}`}>
          <input
            type="text"
            placeholder="Поиск по каталогу..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label="Поиск по каталогу"
          />
          <kbd className={styles.slashIcon} aria-hidden>/</kbd>
          <span className={styles.searchIcon} aria-hidden>
            <svg width="18" height="18" viewBox="0 0 56.966 56.966" fill="currentColor" aria-hidden><path d="M55.146 51.887 41.588 37.786A22.926 22.926 0 0 0 46.984 23c0-12.682-10.318-23-23-23s-23 10.318-23 23 10.318 23 23 23c4.761 0 9.298-1.436 13.177-4.162l13.661 14.208c.571.593 1.339.92 2.162.92.779 0 1.518-.297 2.079-.837a3.004 3.004 0 0 0 .083-4.242zM23.984 6c9.374 0 17 7.626 17 17s-7.626 17-17 17-17-7.626-17-17 7.626-17 17-17z"/></svg>
          </span>
        </label>
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
