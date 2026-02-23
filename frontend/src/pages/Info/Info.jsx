import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Info.module.css';

const PAGES = {
  about: { title: 'О магазине', content: 'SPORT EDA — интернет-магазин спортивного питания и товаров для спорта. Мы предлагаем широкий ассортимент качественной продукции от ведущих брендов.' },
  payment: { title: 'Оплата', content: 'Принимаем оплату картами Visa, Mastercard, а также наличными при получении. Безопасная оплата онлайн.' },
  delivery: { title: 'Доставка', content: 'Доставка по всей стране. Бесплатная доставка при заказе от определённой суммы. Быстрая отправка заказов.' },
  sitemap: { title: 'Карта сайта', content: null, links: null },
};

const ICON_HOME = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const ICON_GRID = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);
const ICON_INFO = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const ICON_USER = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ICON_CARD = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);
const ICON_TRUCK = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const SITEMAP_SECTIONS = [
  {
    id: 'home',
    title: 'Главная',
    description: 'Акции, хиты и быстрый переход в каталог.',
    icon: ICON_HOME,
    links: [{ to: '/', label: 'Главная страница' }],
  },
  {
    id: 'catalog',
    title: 'Каталог',
    description: 'Товары по категориям, фильтры и поиск.',
    icon: ICON_GRID,
    links: [{ to: '/catalog', label: 'Весь каталог' }],
  },
  {
    id: 'info',
    title: 'Информация',
    description: 'О магазине, самовывоз и карта сайта.',
    icon: ICON_INFO,
    links: [
      { to: '/about', label: 'О магазине' },
      { to: '/payment', label: 'Самовывоз' },
      { to: '/sitemap', label: 'Карта сайта' },
    ],
  },
  {
    id: 'account',
    title: 'Аккаунт',
    description: 'Вход, регистрация, корзина, избранное и заказы.',
    icon: ICON_USER,
    links: [
      { to: '/login', label: 'Вход' },
      { to: '/register', label: 'Регистрация' },
      { to: '/favorites', label: 'Избранное' },
      { to: '/profile', label: 'Мой профиль / Заказы' },
      { to: '/cart', label: 'Корзина' },
    ],
  },
];

export default function Info({ page }) {
  const data = PAGES[page] || PAGES.about;
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (page !== 'sitemap') return;
    fetch('/api/products/categories')
      .then((r) => r.json())
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, [page]);

  if (page === 'payment') {
    return (
      <main className={styles.main}>
        <div className={`${styles.container} ${styles.containerWide}`}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}> / </span>
            <span>Самовывоз</span>
          </nav>
          <h1 className={styles.paymentDeliveryTitle}>Самовывоз и оплата</h1>
          <p className={styles.paymentDeliveryIntro}>
            Пока мы работаем только в режиме самовывоза. Оформите заказ на сайте — укажите телефон, менеджер свяжется и сообщит, когда заказ будет готов к выдаче. Оплата при получении.
          </p>

          <section className={styles.paymentDeliverySection}>
            <div className={styles.paymentDeliverySectionHeader}>
              <span className={styles.paymentDeliveryIcon}>{ICON_TRUCK}</span>
              <h2 className={styles.paymentDeliverySectionTitle}>Самовывоз</h2>
            </div>
            <div className={styles.paymentDeliveryCards}>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>Как оформить заказ</h3>
                <p className={styles.paymentDeliveryCardText}>
                  Добавьте товары в корзину, перейдите в корзину и нажмите «Оформить заказ». Укажите телефон (обязательно) и при необходимости комментарий. После оформления менеджер свяжется с вами и сообщит, когда заказ можно забрать.
                </p>
              </div>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>Адрес и время выдачи</h3>
                <p className={styles.paymentDeliveryCardText}>
                  Точный адрес точки самовывоза и удобное время выдачи менеджер уточнит при звонке. Заказ резервируется после подтверждения.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.paymentDeliverySection}>
            <div className={styles.paymentDeliverySectionHeader}>
              <span className={styles.paymentDeliveryIcon}>{ICON_CARD}</span>
              <h2 className={styles.paymentDeliverySectionTitle}>Оплата</h2>
            </div>
            <div className={styles.paymentDeliveryCards}>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>При получении</h3>
                <p className={styles.paymentDeliveryCardText}>
                  Оплата наличными или картой в точке самовывоза при получении заказа. Удобно оплатить после проверки товара.
                </p>
              </div>
            </div>
            <p className={styles.paymentDeliveryNote}>
              По вопросам заказа и самовывоза используйте «Заказать звонок» в шапке сайта или «Обратную связь» в личном кабинете.
            </p>
          </section>

          <section className={styles.paymentDeliverySection}>
            <div className={styles.paymentDeliverySectionHeader}>
              <span className={styles.paymentDeliveryIcon}>{ICON_INFO}</span>
              <h2 className={styles.paymentDeliverySectionTitle}>Контакты и поддержка</h2>
            </div>
            <p className={styles.paymentDeliveryCardText}>
              Нужна помощь с выбором товара или оформлением заказа? Используйте кнопку «Заказать звонок» в шапке сайта — мы перезвоним в удобное время. Либо создайте обращение в разделе «Обратная связь» в личном кабинете — мы ответим в течение рабочего дня.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (page === 'delivery') {
    return (
      <main className={styles.main}>
        <div className={`${styles.container} ${styles.containerWide}`}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}> / </span>
            <Link to="/payment">Самовывоз</Link>
          </nav>
          <h1 className={styles.paymentDeliveryTitle}>Самовывоз</h1>
          <p className={styles.paymentDeliveryIntro}>
            Сейчас доступен только самовывоз. Подробности — на странице <Link to="/payment">Самовывоз и оплата</Link>.
          </p>
        </div>
      </main>
    );
  }

  if (page === 'sitemap') {
    const catalogLinks = [
      { to: '/catalog', label: 'Весь каталог' },
      ...categories.map((c) => ({ to: `/catalog?category=${encodeURIComponent(c.slug || '')}`, label: c.name || `Категория ${c.id}` })),
    ];
    const sections = SITEMAP_SECTIONS.map((s) =>
      s.id === 'catalog' ? { ...s, links: catalogLinks } : s
    );

    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}> &gt; </span>
            <span>Карта сайта</span>
          </nav>
          <h1 className={styles.pageTitle}>Карта сайта</h1>
          <p className={styles.sitemapSubtitle}>Все разделы и страницы интернет-магазина SPORT EDA</p>
          <p className={styles.sitemapIntro}>
            Выберите раздел или перейдите в каталог по категориям.
          </p>
          <div className={styles.sitemapGrid}>
            {sections.map((section) => (
              <section key={section.id} className={styles.sitemapSection}>
                <div className={styles.sitemapSectionHeader}>
                  <span className={styles.sitemapSectionIcon}>{section.icon}</span>
                  <h2 className={styles.sitemapSectionTitle}>{section.title}</h2>
                </div>
                {section.description && (
                  <p className={styles.sitemapSectionDesc}>{section.description}</p>
                )}
                <ul className={styles.sitemapList}>
                  {section.links.map(({ to, label }) => (
                    <li key={`${to}-${label}`}>
                      <Link to={to} className={styles.sitemapLink}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1>{data.title}</h1>
        {data.content && <p>{data.content}</p>}
        {data.links && (
          <ul className={styles.links}>
            {data.links.map(({ to, label }) => (
              <li key={to}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
