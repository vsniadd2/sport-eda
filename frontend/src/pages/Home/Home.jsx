import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import ProductCard from '../../components/ProductCard/ProductCard';
import Loader from '../../components/Loader/Loader';
import styles from './Home.module.css';

export default function Home() {
  const [popularCategories, setPopularCategories] = useState([]);
  const [bestProducts, setBestProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sale');

  const fetchHomeData = useCallback(() => {
    setLoading(true);
    fetch('/api/home')
      .then((r) => r.json())
      .then(({ bestProducts: prods, popularCategories: cats }) => {
        setBestProducts(Array.isArray(prods) ? prods : []);
        setPopularCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchBanners = useCallback(() => {
    fetch('/api/home/banners')
      .then((r) => r.json())
      .then((list) => setBanners(Array.isArray(list) ? list : []))
      .catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  useEffect(() => {
    if (banners.length > 0 && bannerIndex >= banners.length) {
      setBannerIndex(0);
    }
  }, [banners.length, bannerIndex]);

  useEffect(() => {
    const socket = io(window.location.origin);
    socket.on('productsChanged', () => fetchHomeData());
    socket.on('homeBannersChanged', () => fetchBanners());
    return () => socket.disconnect();
  }, [fetchHomeData, fetchBanners]);

  const filteredBestProducts = (() => {
    if (activeTab === 'sale') return bestProducts.filter((p) => p.is_sale).slice(0, 8);
    if (activeTab === 'hit') return bestProducts.filter((p) => p.is_hit).slice(0, 8);
    if (activeTab === 'rec') return bestProducts.filter((p) => p.is_recommended).slice(0, 8);
    return bestProducts.slice(0, 8);
  })();

  const hasBanners = banners.length > 0;
  const goPrev = () => setBannerIndex((i) => (i <= 0 ? banners.length - 1 : i - 1));
  const goNext = () => setBannerIndex((i) => (i >= banners.length - 1 ? 0 : i + 1));

  return (
    <main className={styles.main}>
      <section className={styles.banner}>
        {hasBanners ? (
          <div className={styles.carousel}>
            <div className={styles.carouselTrack}>
              {banners.map((b, i) => (
                <div
                  key={b.id}
                  className={styles.carouselSlide}
                  style={{ display: i === bannerIndex ? 'block' : 'none' }}
                >
                  {b.link_url ? (
                    <a href={b.link_url} className={styles.bannerLink} target="_blank" rel="noopener noreferrer">
                      {b.has_image && (
                        <img
                          src={`/api/home/banners/${b.id}/image`}
                          alt={b.title || 'Баннер'}
                          className={styles.bannerImage}
                        />
                      )}
                      {b.title && <span className={styles.carouselTitle}>{b.title}</span>}
                    </a>
                  ) : (
                    <>
                      {b.has_image && (
                        <img
                          src={`/api/home/banners/${b.id}/image`}
                          alt={b.title || 'Баннер'}
                          className={styles.bannerImage}
                        />
                      )}
                      {b.title && <span className={styles.carouselTitle}>{b.title}</span>}
                    </>
                  )}
                </div>
              ))}
            </div>
            {banners.length > 1 && (
              <>
                <button
                  type="button"
                  className={styles.carouselBtnPrev}
                  onClick={goPrev}
                  aria-label="Предыдущий слайд"
                />
                <button
                  type="button"
                  className={styles.carouselBtnNext}
                  onClick={goNext}
                  aria-label="Следующий слайд"
                />
                <div className={styles.carouselDots}>
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={i === bannerIndex ? styles.carouselDotActive : styles.carouselDot}
                      onClick={() => setBannerIndex(i)}
                      aria-label={`Слайд ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <Link to="/catalog" className={styles.bannerLink}>
            <img src="/Img/banner.jpeg" alt="Спортивное питание — в каталог" className={styles.bannerImage} />
            <span className={styles.bannerOverlay}>
              <span className={styles.heroLabel}>Каталог товаров</span>
              <h1>Спортивное питание и товары для спорта</h1>
              <p>Интернет-магазин спортивного и здорового питания</p>
              <span className={styles.heroBtn}>В каталог</span>
            </span>
          </Link>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Популярные категории</h2>
            <Link to="/catalog" className={styles.allCatalog}>ВЕСЬ КАТАЛОГ</Link>
          </div>
          {loading && popularCategories.length === 0 ? (
            <Loader wrap />
          ) : (
            <div className={styles.categoryGrid}>
              {popularCategories.map((cat) => (
                <Link key={cat.id} to={`/catalog?category=${cat.slug}`} className={styles.categoryCard}>
                  <div className={styles.categoryImage}>
                    {cat.has_image ? <img src={`/api/products/categories/${cat.id}/image`} alt="" /> : null}
                  </div>
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
            </div>
            <Link to="/catalog" className={styles.allCatalog}>ВЕСЬ КАТАЛОГ</Link>
          </div>
          {loading && bestProducts.length === 0 ? (
            <Loader wrap />
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
