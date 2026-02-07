import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import CallbackModal from '../CallbackModal/CallbackModal';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { totalCount: favoritesCount } = useFavorites();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const dropdownRef = useRef(null);

  const openCallback = () => {
    setCallbackOpen(true);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const displayName = user?.username || user?.email?.split('@')[0] || user?.email || 'Профиль';

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoTitle}>
              <span className={styles.logoAccent}>SPORT</span>
              <span className={styles.logoDark}> EDA</span>
            </span>
            <span className={styles.logoSub}>Интернет-магазин спортивных товаров</span>
          </Link>
          <div className={styles.contactsBlock}>
            <div className={styles.phones}>
              <a href="tel:+375257802345">+375 25 780-23-45</a>
              <a href="tel:+375259057976">+375 25 905-79-76</a>
            </div>
            <button type="button" className={styles.callbackBtn} onClick={() => setCallbackOpen(true)}>Заказать звонок</button>
          </div>
          <nav className={styles.nav}>
            <Link to="/" className={isActive('/') && location.pathname === '/' ? styles.navLinkActive : styles.navLink}>
              ГЛАВНАЯ
            </Link>
            <Link to="/catalog" className={isActive('/catalog') ? styles.navLinkActive : styles.navLink}>
              КАТАЛОГ
            </Link>
            <Link to="/payment" className={isActive('/payment') ? styles.navLinkActive : styles.navLink}>
              ОПЛАТА И ДОСТАВКА
            </Link>
            <Link to="/about" className={isActive('/about') ? styles.navLinkActive : styles.navLink}>
              О НАС
            </Link>
            <Link to="/sitemap" className={isActive('/sitemap') ? styles.navLinkActive : styles.navLink}>
              КАРТА САЙТА
            </Link>
          </nav>
          <div className={styles.icons}>
            <button type="button" className={styles.iconBtn} aria-label="Поиск">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            {user ? (
              <div className={styles.userDropdown} ref={dropdownRef}>
                <button type="button" className={styles.iconBtn} onClick={() => setOpen(!open)} aria-label="Профиль">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {open && (
                  <div className={styles.dropdown}>
                    <span className={styles.dropdownName}>{displayName}</span>
                    <Link to="/profile" className={styles.dropdownLink} onClick={() => setOpen(false)}>Заказы</Link>
                    {user?.role === 'admin' && (
                      <Link to="/admin" className={styles.dropdownLink} onClick={() => setOpen(false)}>Админ панель</Link>
                    )}
                    <button type="button" onClick={() => { logout(); setOpen(false); }} className={styles.logoutBtn}>Выйти</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className={styles.iconBtn} aria-label="Вход">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </Link>
            )}
            <Link to="/favorites" className={styles.cartWrap} aria-label="Избранное">
              <span className={styles.iconBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </span>
              {favoritesCount > 0 && <span className={styles.cartBadge}>{favoritesCount}</span>}
            </Link>
            <Link to="/cart" className={styles.cartWrap}>
              <span className={styles.iconBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              </span>
              {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
            </Link>
            <button
              type="button"
              className={styles.burger}
              aria-label="Меню"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className={styles.mobileMenu} role="dialog" aria-label="Меню">
          <nav className={styles.mobileNav}>
            <Link to="/" className={isActive('/') && location.pathname === '/' ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              Главная
            </Link>
            <Link to="/catalog" className={isActive('/catalog') ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              Каталог
            </Link>
            <Link to="/payment" className={isActive('/payment') ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              Оплата и доставка
            </Link>
            <Link to="/about" className={isActive('/about') ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              О нас
            </Link>
            <Link to="/sitemap" className={isActive('/sitemap') ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              Карта сайта
            </Link>
          </nav>
          <div className={styles.mobileContacts}>
            <a href="tel:+375257802345">+375 25 780-23-45</a>
            <a href="tel:+375259057976">+375 25 905-79-76</a>
            <button type="button" className={styles.callbackBtn} onClick={openCallback}>Заказать звонок</button>
          </div>
        </div>
      )}
      <CallbackModal isOpen={callbackOpen} onClose={() => setCallbackOpen(false)} />
    </header>
  );
}
