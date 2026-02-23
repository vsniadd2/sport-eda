import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Loader from '../../components/Loader/Loader';
import ScrollReveal from '../../components/ScrollReveal/ScrollReveal';
import styles from './Home.module.css';

export default function Home() {
  const [popularCategories, setPopularCategories] = useState([]);
  const [bestProducts, setBestProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  useEffect(() => {
    const socket = io(window.location.origin);
    socket.on('productsChanged', () => fetchHomeData());
    return () => socket.disconnect();
  }, [fetchHomeData]);

  const saleProducts = bestProducts.filter((p) => p.is_sale).slice(0, 4);

  return (
    <main className={styles.main}>
      {/* Hero Banner */}
      <section className={styles.heroSection}>
        <div className={styles.heroImageWrap}>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAz8OKu-kxA9EjhozJH5zEahfn9O_CI52eV9E_Pc39S4mr2LKrfAn9TFVyKXk7x7YnxdM0pa4-1Yw0ltnDzMHCXmtmdL9qwiKpi97MCr7qPk3KPK6ZqQehD1g5KobWcHp8GZjvbLwtLHYjOUb9DHWsh4C1scl0v20qeJHuxI63kBa_B02V3D81B4r3kzFgm__2Fw3VVk8WbMFYZdFqYa4vXnUtbwwrGkQZBCKFSpZ9o-0N-ZEIRYOulpOUcBNIGOHEmlbbnbtJSPRLc"
            alt="Спортивное питание"
            className={styles.heroImage}
          />
          <div className={styles.heroGradient}></div>
        </div>
        <div className={styles.heroContent}>
          <ScrollReveal className={styles.heroInner}>
            <h1 className={styles.heroTitle}>
              Твой путь к <span className={styles.heroAccent}>результату</span>
            </h1>
            <p className={styles.heroText}>
              Высококачественное спортивное питание от ведущих мировых брендов для достижения ваших максимальных целей.
            </p>
            <div className={styles.heroButtons}>
              <Link to="/catalog" className={styles.heroBtn}>
                В КАТАЛОГ
              </Link>
              <Link to="/catalog?sale=true" className={styles.heroBtnSecondary}>
                АКЦИИ
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Benefits Bar */}
      <ScrollReveal as="section" className={styles.benefitsBar}>
        <div className={styles.benefitsContainer}>
          <ScrollReveal delay={0}>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 18.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
              <div>
                <h3>Премиум качество</h3>
                <p>Проверенные бренды и контроль качества</p>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                </svg>
              </div>
              <div>
                <h3>100% Оригинал</h3>
                <p>Сертифицированная продукция</p>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <div className={styles.benefitItem}>
              <div className={styles.benefitIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.22C21 6.73 16.74 3 12 3c-4.69 0-9 3.65-9 9.28-.6.34-1 .98-1 1.72v2c0 1.1.9 2 2 2h1v-6.1c0-3.87 3.13-7 7-7s7 3.13 7 7V19h-8v2h8c1.1 0 2-.9 2-2v-1.22c.59-.31 1-.92 1-1.64v-2.3c0-.7-.41-1.31-1-1.62z"/>
                </svg>
              </div>
              <div>
                <h3>Советы экспертов</h3>
                <p>Бесплатная консультация</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </ScrollReveal>

      {/* Popular Categories */}
      <ScrollReveal as="section" className={styles.section}>
        <div className={styles.container}>
          <ScrollReveal delay={0}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Популярные категории</h2>
                <div className={styles.titleUnderline}></div>
              </div>
              <Link to="/catalog" className={styles.viewAllLink}>
                ВСЕ КАТЕГОРИИ
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </ScrollReveal>
          {loading && popularCategories.length === 0 ? (
            <Loader wrap />
          ) : (
            <ScrollReveal delay={100}>
              <div className={styles.categoryGrid}>
                {popularCategories.slice(0, 5).map((cat) => (
                  <Link key={cat.id} to={`/catalog?category=${cat.slug}`} className={styles.categoryCard}>
                    <div className={styles.categoryImageWrap}>
                      {cat.has_image ? (
                        <img src={`/api/products/categories/${cat.id}/image`} alt={cat.name} />
                      ) : (
                        <div className={styles.categoryPlaceholder}></div>
                      )}
                      <div className={styles.categoryOverlay}></div>
                      <p className={styles.categoryName}>{cat.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollReveal>
          )}
        </div>
      </ScrollReveal>

      {/* Best Products */}
      <ScrollReveal as="section" className={styles.offersSection}>
        <div className={styles.container}>
          <ScrollReveal delay={0}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Лучшие предложения</h2>
                <div className={styles.titleUnderline}></div>
              </div>
            </div>
          </ScrollReveal>
          {loading && bestProducts.length === 0 ? (
            <Loader wrap />
          ) : (
            <ScrollReveal delay={120}>
              <div className={styles.productGrid}>
                {saleProducts.map((product) => (
                  <Link key={product.id} to={`/product/${product.id}`} className={styles.productCard}>
                    <div className={styles.productImageWrap}>
                      {product.is_sale && product.price && product.old_price && product.old_price > product.price && (
                        <span className={styles.saleBadge}>SALE</span>
                      )}
                      <span className={styles.stockBadge}>
                        <span className={styles.stockDot}></span>
                        В НАЛИЧИИ
                      </span>
                      {product.has_image ? (
                        <img 
                          src={`/api/products/${product.id}/image`} 
                          alt={product.name}
                          className={styles.productImage}
                        />
                      ) : (
                        <div className={styles.productPlaceholder}></div>
                      )}
                    </div>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{product.name}</h3>
                      <p className={styles.productWeight}>Weight: {product.weight || '1 кг'}</p>
                      <div className={styles.productFooter}>
                        <div className={styles.priceBlock}>
                          <span className={styles.price}>{product.price.toLocaleString('ru-RU')} BYN</span>
                          {product.old_price && product.old_price > product.price && (
                            <span className={styles.oldPrice}>{product.old_price.toLocaleString('ru-RU')} BYN</span>
                          )}
                        </div>
                        <button className={styles.addToCartBtn} onClick={(e) => e.preventDefault()}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                          </svg>
                          В КОРЗИНУ
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollReveal>
          )}
        </div>
      </ScrollReveal>

      {/* CTA Section - Профессиональный подход */}
      <ScrollReveal as="section" className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <ScrollReveal delay={0}>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>
                Профессиональный подход к вашему прогрессу
              </h2>
              <p className={styles.ctaText}>
                Мы — не просто магазин. Мы ваш партнер в достижении спортивных высот. Только сертифицированные бренды, экспертная поддержка на каждом этапе и программа лояльности для тех, кто идет к цели.
              </p>
              <div className={styles.ctaButtons}>
                <Link to="/about" className={styles.ctaBtnPrimary}>
                  УЗНАТЬ БОЛЬШЕ
                </Link>
                <Link to="/about" className={styles.ctaBtnSecondary}>
                  БОНУСНАЯ ПРОГРАММА
                </Link>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <div className={styles.ctaCards}>
              <div className={styles.ctaCard}>
                <span className={styles.ctaCardIcon} aria-hidden>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                  </svg>
                </span>
                <h3>Сертификация</h3>
                <p>Гарантия подлинности каждого товара в нашем каталоге.</p>
              </div>
              <div className={styles.ctaCard}>
                <span className={styles.ctaCardIcon} aria-hidden>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </span>
                <h3>Экспертность</h3>
                <p>Профессиональные консультации по подбору питания.</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </ScrollReveal>
    </main>
  );
}
