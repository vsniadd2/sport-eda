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
    description: 'О магазине, оплата, доставка и карта сайта.',
    icon: ICON_INFO,
    links: [
      { to: '/about', label: 'О магазине' },
      { to: '/payment', label: 'Оплата' },
      { to: '/delivery', label: 'Доставка' },
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
            <span>Оплата и доставка</span>
          </nav>
          <h1 className={styles.paymentDeliveryTitle}>Оплата и доставка</h1>
          <p className={styles.paymentDeliveryIntro}>
            Удобные способы оплаты и быстрая доставка по всей Беларуси. Мы работаем с физическими и юридическими лицами. Оформите заказ на сайте — менеджер свяжется для уточнения деталей, после чего мы соберём и отправим заказ в кратчайшие сроки. Ниже вы найдёте подробную информацию о способах оплаты, сроках доставки и условиях возврата.
          </p>

          <section className={styles.paymentDeliverySection}>
            <div className={styles.paymentDeliverySectionHeader}>
              <span className={styles.paymentDeliveryIcon}>{ICON_CARD}</span>
              <h2 className={styles.paymentDeliverySectionTitle}>Оплата</h2>
            </div>
            <div className={styles.paymentDeliveryCards}>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>Картой онлайн</h3>
                <p className={styles.paymentDeliveryCardText}>
                  Оплата банковской картой Visa или Mastercard при оформлении заказа. Безопасное проведение платежа через защищённый канал. Списание средств обычно происходит в течение нескольких минут; в редких случаях банк может обрабатывать платёж до 1–2 рабочих дней.
                </p>
              </div>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>При получении</h3>
                <p className={styles.paymentDeliveryCardText}>
                  Наличными или картой курьеру при получении заказа. Удобно, если вы предпочитаете оплатить после проверки товара. Возможность оплаты картой при получении уточняйте у менеджера при подтверждении заказа.
                </p>
              </div>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>Безопасность платежей</h3>
                <p className={styles.paymentDeliveryCardText}>
                  Мы не храним и не имеем доступа к полным данным вашей карты. Все операции проходят через платёжного провайдера с соблюдением стандартов безопасности. Рекомендуем не передавать данные карты третьим лицам и не оплачивать заказы по сомнительным ссылкам.
                </p>
              </div>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>Возврат средств</h3>
                <p className={styles.paymentDeliveryCardText}>
                  При отмене заказа или возврате товара средства возвращаются на ту же карту, с которой была произведена оплата. Срок зачисления — до 10 рабочих дней в зависимости от банка. При оплате при получении возврат обсуждается индивидуально.
                </p>
              </div>
            </div>
            <p className={styles.paymentDeliveryNote}>
              По любым вопросам, связанным с оплатой, свяжитесь с нами через раздел «Заказать звонок» в шапке сайта или через «Обратную связь» в личном кабинете.
            </p>
          </section>

          <section className={styles.paymentDeliverySection}>
            <div className={styles.paymentDeliverySectionHeader}>
              <span className={styles.paymentDeliveryIcon}>{ICON_TRUCK}</span>
              <h2 className={styles.paymentDeliverySectionTitle}>Доставка</h2>
            </div>
            <div className={styles.paymentDeliveryCards}>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>По Минску и регионам РБ</h3>
                <p className={styles.paymentDeliveryCardText}>
                  Доставка по Минску — в течение 1–2 рабочих дней после подтверждения заказа. По территории Беларуси — 2–4 рабочих дня в зависимости от региона. Для отдалённых населённых пунктов срок может быть увеличен; точные сроки и стоимость менеджер сообщит при подтверждении.
                </p>
              </div>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>Бесплатная доставка</h3>
                <p className={styles.paymentDeliveryCardText}>
                  При заказе от 100 BYN доставка по Минску — бесплатно. Для других регионов порог бесплатной доставки уточняйте при оформлении. Самовывоз возможен по предварительной договорённости — укажите это в комментарии к заказу или при общении с менеджером.
                </p>
              </div>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>Упаковка и сохранность</h3>
                <p className={styles.paymentDeliveryCardText}>
                  Все товары упаковываются аккуратно: банки и пакеты со спортивным питанием дополнительно фиксируются, хрупкие аксессуары защищаются. Мы заботимся о том, чтобы заказ дошёл до вас в идеальном состоянии. При получении рекомендуем проверить целостность упаковки.
                </p>
              </div>
              <div className={styles.paymentDeliveryCard}>
                <h3 className={styles.paymentDeliveryCardTitle}>Отслеживание заказа</h3>
                <p className={styles.paymentDeliveryCardText}>
                  После отправки заказа мы сообщим вам номер отправления и ссылку для отслеживания (если перевозчик поддерживает трекинг). Вы сможете видеть статус доставки в личном кабинете и по ссылке из SMS или email.
                </p>
              </div>
            </div>
            <p className={styles.paymentDeliveryNote}>
              После отправки заказа вы получите информацию для отслеживания. Если у вас остались вопросы по доставке — напишите в раздел «Обратная связь» или закажите звонок.
            </p>
          </section>

          <section className={styles.paymentDeliverySection}>
            <div className={styles.paymentDeliverySectionHeader}>
              <span className={styles.paymentDeliveryIcon}>{ICON_INFO}</span>
              <h2 className={styles.paymentDeliverySectionTitle}>Контакты и поддержка</h2>
            </div>
            <p className={styles.paymentDeliveryCardText}>
              Нужна помощь с выбором товара, оформлением заказа или уточнением условий доставки? Используйте кнопку «Заказать звонок» в шапке сайта — мы перезвоним в удобное время. Либо войдите в личный кабинет и создайте обращение в разделе «Обратная связь» — мы ответим в течение рабочего дня.
            </p>
          </section>
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
