import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import FeedbackSupportNotifier from '../components/FeedbackSupportNotifier/FeedbackSupportNotifier';

export default function MainLayout() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    fetch('/api/visit', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, [location.pathname]);

  return (
    <div className="app">
      <FeedbackSupportNotifier />
      <Header />
      <div className="app-content">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
