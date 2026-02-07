import { Link } from 'react-router-dom';
import styles from './Info.module.css';

const PAGES = {
  about: { title: 'О магазине', content: 'SPORT EDA — интернет-магазин спортивного питания и товаров для спорта. Мы предлагаем широкий ассортимент качественной продукции от ведущих брендов.' },
  payment: { title: 'Оплата', content: 'Принимаем оплату картами Visa, Mastercard, а также наличными при получении. Безопасная оплата онлайн.' },
  delivery: { title: 'Доставка', content: 'Доставка по всей стране. Бесплатная доставка при заказе от определённой суммы. Быстрая отправка заказов.' },
  sitemap: { title: 'Карта сайта', content: null, links: null },
};

const SITEMAP_SECTIONS = [
  {
    title: 'Главная',
    links: [{ to: '/', label: 'Главная страница' }],
  },
  {
    title: 'Каталог',
    links: [{ to: '/catalog', label: 'Каталог товаров' }],
  },
  {
    title: 'Информация',
    links: [
      { to: '/about', label: 'О магазине' },
      { to: '/payment', label: 'Оплата и доставка' },
      { to: '/sitemap', label: 'Карта сайта' },
    ],
  },
  {
    title: 'Аккаунт',
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

  if (page === 'sitemap') {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}> &gt; </span>
            <span>Карта сайта</span>
          </nav>
          <h1 className={styles.pageTitle}>Карта сайта</h1>
          <p className={styles.sitemapIntro}>
            Все разделы и страницы интернет-магазина SPORT EDA. Выберите нужный раздел.
          </p>
          <div className={styles.sitemapGrid}>
            {SITEMAP_SECTIONS.map((section) => (
              <section key={section.title} className={styles.sitemapSection}>
                <h2 className={styles.sitemapSectionTitle}>{section.title}</h2>
                <ul className={styles.sitemapList}>
                  {section.links.map(({ to, label }) => (
                    <li key={to}>
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
