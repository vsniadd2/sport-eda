import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard';
import styles from './Home.module.css';

export default function Home() {
  const [popularCategories, setPopularCategories] = useState([]);
  const [bestProducts, setBestProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetch('/api/home')
      .then((r) => r.json())
      .then(({ bestProducts: prods, popularCategories: cats }) => {
        setBestProducts(Array.isArray(prods) ? prods : []);
        setPopularCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredBestProducts = (() => {
    if (activeTab === 'sale') return bestProducts.filter((p) => p.is_sale).slice(0, 8);
    if (activeTab === 'hit') return bestProducts.filter((p) => p.is_hit).slice(0, 8);
    if (activeTab === 'rec') return bestProducts.filter((p) => p.is_recommended).slice(0, 8);
    return bestProducts.slice(0, 8);
  })();

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
              {popularCategories.map((cat) => (
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
              {filteredBestProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} showTag={i < 4} showAvailability />
              ))}
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
