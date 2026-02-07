import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard';
import styles from './Home.module.css';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/products/categories').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const bestOffers = products.slice(0, 8);

  return (
    <main className={styles.main}>
      <section className={styles.banner}>
        <Link to="/catalog" className={styles.bannerLink}>
          <img src="/Img/banner.jpeg" alt="Спортивное питание — в каталог" className={styles.bannerImage} />
          <span className={styles.bannerOverlay}>
            <span className={styles.heroLabel}>Каталог товаров</span>
            <h1>Спортивное питание и товары для спорта</h1>
            <p>Интернет-магазин спортивного и здорового питания</p>
            <span className={styles.heroBtn}>В каталог</span>
          </span>
        </Link>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Популярные категории</h2>
            <Link to="/catalog" className={styles.allCatalog}>ВЕСЬ КАТАЛОГ</Link>
          </div>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : (
            <div className={styles.categoryGrid}>
              {categories.map((cat) => (
                <Link key={cat.id} to={`/catalog?category=${cat.slug}`} className={styles.categoryCard}>
                  <div className={styles.categoryImage} />
                  <span className={styles.categoryName}>{cat.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Лучшие предложения</h2>
            <div className={styles.tabs}>
              <button type="button" className={activeTab === 'sale' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('sale')}>Акция</button>
              <button type="button" className={activeTab === 'hit' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('hit')}>Хит</button>
              <button type="button" className={activeTab === 'rec' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('rec')}>Советуем</button>
              <button type="button" className={activeTab === 'new' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('new')}>Нови</button>
            </div>
            <Link to="/catalog" className={styles.allCatalog}>ВЕСЬ КАТАЛОГ</Link>
          </div>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : (
            <div className={styles.productGrid}>
              {bestOffers.map((product, i) => (
                <ProductCard key={product.id} product={product} showTag={i < 4} showAvailability />
              ))}
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
