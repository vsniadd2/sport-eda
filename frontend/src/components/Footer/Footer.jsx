import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.container}>
          <div className={styles.navRow}>
            <div className={styles.col}>
              <h4>КАТАЛОГ</h4>
              <ul>
                <li><Link to="/catalog">Коллекции</Link></li>
                <li><Link to="/catalog">Акции</Link></li>
              </ul>
            </div>
            <div className={styles.col}>
              <h4>КОМПАНИЯ</h4>
              <ul>
                <li><Link to="/about">О компании</Link></li>
                <li><Link to="/about">Новости</Link></li>
                <li><Link to="/about">Блог</Link></li>
                <li><Link to="/about">Отзывы</Link></li>
                <li><Link to="/about">Лицензии</Link></li>
              </ul>
            </div>
            <div className={styles.col}>
              <h4>ИНФОРМАЦИЯ</h4>
              <ul>
                <li><Link to="/about">Магазины</Link></li>
                <li><Link to="/about">Бренды</Link></li>
                <li><Link to="/about">Импортёры</Link></li>
                <li><Link to="/about">Политика конфиденциальности</Link></li>
              </ul>
            </div>
            <div className={styles.col}>
              <h4>ПОМОЩЬ</h4>
              <ul>
                <li><Link to="/payment">Условия оплаты</Link></li>
                <li><Link to="/delivery">Условия доставки</Link></li>
                <li><Link to="/about">Обмен и возврат</Link></li>
              </ul>
            </div>
            <div className={styles.contacts}>
              <p className={styles.contactLine}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                +375 44-5-605-605
              </p>
              <p className={styles.contactLine}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                info@sporteda.by
              </p>
              <div className={styles.addressBlock}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <div>
                  <p>г. Минск, ул. Притыцкого, 23a</p>
                  <p className={styles.hours}>Пн. – Вс.: с 10:00 до 22:00</p>
                  <p>г. Минск, Алми, пр-т Дзержинского 91</p>
                  <p className={styles.hours}>Пн. – Вс.: с 10:00 до 22:00</p>
                </div>
              </div>
              <div className={styles.social}>
                <a href="#" className={styles.socialBtn} aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className={styles.socialBtn} aria-label="Telegram">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.18-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
                </a>
                <a href="#" className={styles.socialBtn} aria-label="Позвонить">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </a>
                <a href="#" className={styles.socialBtn} aria-label="TikTok">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.legal}>
        <div className={styles.container}>
          <p className={styles.copyright}>Интернет-магазин спортивного питания в Минске 2026 © Sport EDA</p>
          <p>Название компании: ООО «ЭрВиЭм Групп»</p>
          <p>УНП 193179268</p>
          <p>Юр. адрес: Республика Беларусь, 220063, г. Минск, ул. Притыцкого, 23А-2, 2-47</p>
          <p>Свидетельство о государственной регистрации № 193179268 от 12.12.2018 выдано Минским горисполкомом</p>
          <p>Интернет-магазин зарегистрирован в Торговом реестре РБ с 18.05.2020</p>
        </div>
      </div>
      <div className={styles.payments}>
        <div className={styles.container}>
          <div className={styles.payRow}>
            <img src="/Img/Visa_2021.svg.png" alt="Visa" className={styles.payImg} />
            <span className={styles.payBadge}>Visa Secure</span>
            <img src="/Img/mastercard-svg.svg" alt="Mastercard" className={styles.payImg} />
            <img src="/Img/mastercard-id-check-svgrepo-com.svg" alt="Mastercard ID Check" className={styles.payImg} />
            <span className={styles.payBadge}>Белкарт</span>
            <span className={styles.payBadge}>bePaid</span>
            <img src="/Img/google-pay-svgrepo-com.svg" alt="Google Pay" className={styles.payImg} />
            <span className={styles.payBadge}>МТБанк</span>
            <img src="/Img/Mir-logo.SVG.svg" alt="МИР" className={styles.payImg} />
            <span className={styles.payBadge}>MIR Accept</span>
            <span className={styles.payBadge}>Я Pay</span>
            <img src="/Img/apple-pay-svgrepo-com.svg" alt="Apple Pay" className={styles.payImg} />
          </div>
        </div>
      </div>
    </footer>
  );
}
