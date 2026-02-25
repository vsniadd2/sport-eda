import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import CallbackModal from '../CallbackModal/CallbackModal';
import SearchModal from '../SearchModal/SearchModal';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { totalCount: favoritesCount } = useFavorites();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownPanelRef = useRef(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const openCallback = () => {
    setCallbackOpen(true);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownRect({ top: rect.bottom + 8, left: rect.right - 180, width: 180 });
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPanel = dropdownPanelRef.current?.contains(e.target);
      if (!inTrigger && !inPanel) setOpen(false);
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
      <div className={styles.container}>
        <div className={styles.leftSection}>
          <Link to="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor"/>
              </svg>
            </div>
            <h2 className={styles.logoText}>СПОРТ-ЕДА</h2>
          </Link>
          <nav className={styles.nav}>
            <Link to="/catalog" className={isActive('/catalog') ? styles.navLinkActive : styles.navLink}>
              КАТАЛОГ
            </Link>
            <Link to="/brands" className={isActive('/brands') ? styles.navLinkActive : styles.navLink}>
              БРЕНДЫ
            </Link>
            <Link to="/catalog?sale=true" className={isActive('/catalog?sale=true') ? styles.navLinkActive : styles.navLink}>
              АКЦИИ
            </Link>
            <Link to="/payment" className={isActive('/payment') ? styles.navLinkActive : styles.navLink}>
              ДОСТАВКА
            </Link>
            <Link to="/about" className={isActive('/about') ? styles.navLinkActive : styles.navLink}>
              О МАГАЗИНЕ
            </Link>
          </nav>
        </div>
        <div className={styles.rightSection}>
          <button
            type="button"
            className={styles.callbackLink}
            onClick={() => setCallbackOpen(true)}
          >
            Заказать звонок
          </button>
          <div className={styles.icons}>
            <button type="button" className={styles.iconBtn} onClick={() => setSearchOpen(true)} aria-label="Поиск">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            {user ? (
              <div className={styles.userDropdown} ref={dropdownRef}>
                <button ref={triggerRef} type="button" className={styles.iconBtn} onClick={() => setOpen(!open)} aria-label="Профиль">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </button>
                {open && dropdownRect && createPortal(
                  <div ref={dropdownPanelRef} className={styles.dropdownPortal} style={{ top: dropdownRect.top, left: dropdownRect.left, minWidth: dropdownRect.width }}>
                    <span className={styles.dropdownName}>{displayName}</span>
                    <Link to="/profile" className={styles.dropdownLink} onClick={() => setOpen(false)}>Профиль</Link>
                    <Link to="/profile/orders" className={styles.dropdownLink} onClick={() => setOpen(false)}>Мои заказы</Link>
                    <Link to="/profile/feedback" className={styles.dropdownLink} onClick={() => setOpen(false)}>Обратная связь</Link>
                    {user?.role === 'admin' && (
                      <Link to="/admin" className={styles.dropdownLink} onClick={() => setOpen(false)}>Админ панель</Link>
                    )}
                    <button type="button" onClick={() => { logout(); setOpen(false); }} className={styles.logoutBtn}>Выйти</button>
                  </div>,
                  document.body
                )}
              </div>
            ) : (
              <Link to="/login" className={styles.iconBtn} aria-label="Вход">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </Link>
            )}
            <Link to="/cart" className={styles.cartWrap} aria-label="Корзина">
              <button className={styles.iconBtn}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
              </button>
            </Link>
            <button
              type="button"
              className={styles.burger}
              aria-label="Меню"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
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
            <Link to="/brands" className={isActive('/brands') ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              Бренды
            </Link>
            <Link to="/catalog?sale=true" className={isActive('/catalog?sale=true') ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              Акции
            </Link>
            <Link to="/payment" className={isActive('/payment') ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              Доставка
            </Link>
            <Link to="/about" className={isActive('/about') ? styles.mobileNavActive : styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              О магазине
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
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
