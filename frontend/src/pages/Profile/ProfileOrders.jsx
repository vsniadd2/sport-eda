import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { formatPrice } from '../../utils/formatPrice';
import { formatDateTime } from '../../utils/formatDate';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import Loader from '../../components/Loader/Loader';
import styles from './Profile.module.css';

const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';

export default function ProfileOrders() {
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    authFetch(`${API_URL}/orders`)
      .then((r) => {
        if (!r.ok) throw new Error('Не удалось загрузить заказы');
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, authFetch]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const socket = io(window.location.origin, { auth: { token } });
    socket.on('orderUpdated', (payload) => {
      if (!payload?.id) return;
      setOrders((prev) => prev.map((o) => (o.id === payload.id ? payload : o)));
      setDetailOrder((current) => (current?.id === payload.id ? payload : current));
    });
    return () => socket.disconnect();
  }, [user]);

  if (authLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <Loader wrap />
        </div>
      </main>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName = user?.username || user?.email?.split('@')[0] || user?.email || 'Пользователь';

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/">Главная</Link>
          <span className={styles.breadcrumbSep}> / </span>
          <Link to="/profile">Мой профиль</Link>
          <span className={styles.breadcrumbSep}> / </span>
          <span>Мои заказы</span>
        </nav>
        <h1 className={styles.pageTitle}>Мои заказы</h1>

        <section className={styles.section}>
          {orders.length > 0 && <p className={styles.ordersSummary}>Всего заказов: {orders.length}</p>}
          {error && <div className={styles.error}>{error}</div>}
          {loading ? (
            <Loader wrap />
          ) : orders.length === 0 ? (
            <>
              <p className={styles.empty}>У вас пока нет заказов.</p>
              <Link to="/catalog" className={styles.link}>Перейти в каталог</Link>
            </>
          ) : (
            <ul className={styles.orderList}>
              {orders.map((order) => (
                <li key={order.id} className={styles.orderCard}>
                  <button
                    type="button"
                    className={styles.orderCardBtn}
                    onClick={() => setDetailOrder(order)}
                  >
                    <div className={styles.orderHeader}>
                      <span className={styles.orderId}>Заказ №{order.id}</span>
                      <span className={styles.orderDate}>
                        {order.created_at ? formatDateTime(order.created_at) : ''}
                      </span>
                      <span className={styles.orderTotal}>{formatPrice(order.total)}</span>
                    </div>
                    <p className={styles.orderWho}>Оформил: {displayName}</p>
                    <p className={styles.orderStatus}>
                      {order.processed_at ? 'Готов к выдаче' : 'В обработке'}
                    </p>
                    <p className={styles.orderPayment}>
                      {order.payment_method === 'card'
                        ? (order.payment_status === 'paid' ? 'Оплачено' : 'Оплата картой')
                        : 'Оплата при получении'}
                    </p>
                    <p className={styles.orderPreview}>
                      {order.items?.length ? `${order.items.length} ${order.items.length === 1 ? 'товар' : 'товара'}` : ''} · {formatPrice(order.total)}
                    </p>
                    <span className={styles.detailLink}>Подробнее</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
    </main>
  );
}
