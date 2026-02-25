import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import FeedbackSupportNotifier from '../components/FeedbackSupportNotifier/FeedbackSupportNotifier';

const scrollbarOptions = {
  scrollbars: {
    theme: 'os-theme-light',
    visibility: 'auto',
    autoHide: 'scroll',
  },
};

export default function MainLayout() {
  const location = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    fetch('/api/visit', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const instance = scrollRef.current?.osInstance?.();
    if (!instance) return;
    const viewport = instance.elements().viewport;
    if (viewport) viewport.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const isAdmin = location.pathname.startsWith('/admin');
  return (
    <div className={`app${isAdmin ? ' app--admin' : ''}`}>
      <FeedbackSupportNotifier />
      <OverlayScrollbarsComponent
        ref={scrollRef}
        options={scrollbarOptions}
        defer
        className="app-scrollbars"
      >
        <div className="app-layout">
          <Header />
          <div className="app-content">
            <Outlet />
          </div>
          <Footer />
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}
