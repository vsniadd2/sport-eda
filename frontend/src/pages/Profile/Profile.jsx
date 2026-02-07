import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../utils/formatPrice';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import styles from './Profile.module.css';

const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

export default function Profile() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`${API_URL}/orders`, { headers: getAuthHeaders() })
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
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName = user?.username || user?.email?.split('@')[0] || user?.email || 'Пользователь';

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Профиль</h1>
        <p className={styles.greeting}>{displayName}</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Заказы</h2>
          {error && <div className={styles.error}>{error}</div>}
          {loading ? (
            <p className={styles.loading}>Загрузка заказов...</p>
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
                        {order.created_at ? new Date(order.created_at).toLocaleString('ru-RU') : ''}
                      </span>
                      <span className={styles.orderTotal}>{formatPrice(order.total)}</span>
                    </div>
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
