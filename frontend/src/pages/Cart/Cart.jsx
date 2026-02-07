import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import styles from './Cart.module.css';

const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const { items, updateQuantity, removeItem, totalSum, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Войдите, чтобы оформить заказ');
      navigate('/login');
      return;
    }
    if (items.length === 0) {
      setError('Корзина пуста');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        address: address.trim() || null,
        phone: phone.trim() || null,
      };
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка оформления');
      clearCart();
      notify('Заказ успешно оформлен', 'success');
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.empty}>
            <h1 className={styles.title}>Корзина</h1>
            <p className={styles.emptyText}>В корзине пока ничего нет</p>
            <Link to="/catalog" className={styles.ctaLink}>Перейти в каталог</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Корзина</h1>
        {!user && items.length > 0 && (
          <div className={styles.authNote}>
            Для оформления заказа необходимо <Link to="/login">войти</Link> или <Link to="/register">зарегистрироваться</Link>.
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.grid}>
          <section className={styles.items}>
            {items.map((i) => (
              <article key={i.product_id} className={styles.item}>
                <div className={styles.itemMain}>
                  <div className={styles.itemThumb}>
                    {i.image_url ? (
                      <img src={i.image_url} alt="" />
                    ) : (
                      <Link to={`/product/${i.product_id}`} className={styles.itemThumbPlaceholder}>Товар</Link>
                    )}
                  </div>
                  <div className={styles.itemInfo}>
                    <Link to={`/product/${i.product_id}`} className={styles.itemName}>
                      {i.name || `Товар #${i.product_id}`}
                    </Link>
                    <span className={styles.itemPrice}>
                      {formatPrice(i.price)} × {i.quantity} = {formatPrice((i.price || 0) * i.quantity)}
                    </span>
                    <div className={styles.itemActions}>
                      <div className={styles.quantity}>
                        <button
                          type="button"
                          aria-label="Уменьшить"
                          onClick={() => updateQuantity(i.product_id, i.quantity - 1)}
                        >
                          −
                        </button>
                        <span>{i.quantity}</span>
                        <button
                          type="button"
                          aria-label="Увеличить"
                          onClick={() => updateQuantity(i.product_id, i.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeItem(i.product_id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <aside className={styles.checkout}>
            <div className={styles.checkoutCard}>
              <h2 className={styles.checkoutTitle}>Оформление заказа</h2>
              <p className={styles.checkoutNote}>
                Сейчас заказ создаётся без оплаты. Оплата будет подключена позже.
              </p>
              <form onSubmit={handleOrder} className={styles.form}>
                <label className={styles.label}>
                  Адрес доставки
                  <input
                    placeholder="Город, улица, дом"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
                <label className={styles.label}>
                  Телефон
                  <input
                    type="tel"
                    placeholder="+375 (29) 000-00-00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <div className={styles.totalRow}>
                  <span>Итого:</span>
                  <span className={styles.totalSum}>{formatPrice(totalSum)}</span>
                </div>
                <button type="submit" disabled={loading || !user} className={styles.submitBtn}>
                  {loading ? 'Оформление...' : !user ? 'Войдите для оформления' : 'Оформить заказ'}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
