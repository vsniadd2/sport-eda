import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import FieldError from '../../components/FieldError/FieldError';
import OrderStatusStepper from '../../components/OrderStatusStepper/OrderStatusStepper';
import PaymentModal from '../../components/PaymentModal/PaymentModal';
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
  const [paymentMethod, setPaymentMethod] = useState('on_delivery');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const submitOrder = useCallback(
    async (paymentCardData = null) => {
      const payload = {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        address: address.trim() || null,
        phone: phone.trim() || null,
        payment_method: paymentMethod,
      };
      if (paymentMethod === 'card' && paymentCardData?.card_last4) {
        payload.card_last4 = paymentCardData.card_last4;
      }
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка оформления');
      clearCart();
      notify('Заказ успешно оформлен', 'success');
      setCreatedOrder(data);
      return data;
    },
    [items, address, phone, paymentMethod, clearCart, notify]
  );

  const handleOrder = async (e) => {
    e.preventDefault();
    setFieldError(null);
    if (!user) {
      setError('Войдите, чтобы оформить заказ');
      navigate('/login');
      return;
    }
    if (items.length === 0) {
      setError('Корзина пуста');
      return;
    }
    if (paymentMethod === 'on_delivery') {
      if (!address.trim()) {
        setFieldError({ field: 'address', message: 'Заполните это поле.' });
        return;
      }
      if (!phone.trim()) {
        setFieldError({ field: 'phone', message: 'Заполните это поле.' });
        return;
      }
      setLoading(true);
      setError('');
      try {
        await submitOrder();
      } catch (e) {
        setError(e.message);
        notify(e.message, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (paymentMethod === 'card') {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSubmit = async (cardData) => {
    setError('');
    try {
      await submitOrder(cardData);
      setShowPaymentModal(false);
    } catch (e) {
      notify(e.message, 'error');
      throw e;
    }
  };

  const goToOrders = () => {
    setCreatedOrder(null);
    navigate('/profile/orders');
  };

  const goToHome = () => {
    setCreatedOrder(null);
    navigate('/');
  };

  useEffect(() => {
    if (!createdOrder?.id || !user) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const socket = io(window.location.origin, { auth: { token } });
    socket.on('orderUpdated', (payload) => {
      if (payload?.id === createdOrder.id) setCreatedOrder(payload);
    });
    return () => socket.disconnect();
  }, [createdOrder?.id, user]);

  if (createdOrder) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}> / </span>
            <span>Корзина</span>
          </nav>
          <div className={styles.successBlock}>
            <h1 className={styles.successTitle}>Заказ №{createdOrder.id} оформлен</h1>
            <p className={styles.successPaymentText}>
              {createdOrder.payment_status === 'paid'
                ? 'Оплата получена'
                : 'Ожидаем оплату при получении'}
            </p>
            <OrderStatusStepper order={createdOrder} />
            <div className={styles.successActions}>
              <button type="button" className={styles.successBtnPrimary} onClick={goToOrders}>
                Перейти к моим заказам
              </button>
              <button type="button" className={styles.successBtnSecondary} onClick={goToHome}>
                На главную
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Главная</Link>
            <span className={styles.breadcrumbSep}> / </span>
            <span>Корзина</span>
          </nav>
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </div>
            <h1 className={styles.emptyTitle}>Корзина пуста</h1>
            <p className={styles.emptyText}>Добавьте товары из каталога — они появятся здесь</p>
            <Link to="/catalog" className={styles.ctaLink}>Перейти в каталог</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/">Главная</Link>
          <span className={styles.breadcrumbSep}> / </span>
          <span>Корзина</span>
        </nav>
        <h1 className={styles.title}>Корзина</h1>
        <p className={styles.subtitle}>Товаров в корзине: {items.length}</p>

        {!user && items.length > 0 && (
          <div className={styles.authNote}>
            Для оформления заказа <Link to="/login">войдите</Link> или <Link to="/register">зарегистрируйтесь</Link>.
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.grid}>
          <section className={styles.items}>
            {items.map((i) => (
              <article key={i.product_id} className={styles.item}>
                <Link to={`/catalog/${i.product_id}`} className={styles.itemThumb}>
                  {i.image_url ? (
                    <img src={i.image_url} alt="" />
                  ) : (
                    <span className={styles.itemThumbPlaceholder}>Фото</span>
                  )}
                </Link>
                <div className={styles.itemBody}>
                  <Link to={`/catalog/${i.product_id}`} className={styles.itemName}>
                    {i.name || `Товар #${i.product_id}`}
                  </Link>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemPrice}>{formatPrice(i.price)}</span>
                    <span className={styles.itemQuantity}> × {i.quantity} шт.</span>
                  </div>
                  <div className={styles.itemRow}>
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
                    <span className={styles.itemTotal}>{formatPrice((i.price || 0) * i.quantity)}</span>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeItem(i.product_id)}
                      aria-label="Удалить из корзины"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className={styles.checkout}>
            <div className={styles.checkoutCard}>
              <h2 className={styles.checkoutTitle}>Оформление заказа</h2>
              <form onSubmit={handleOrder} className={styles.form} noValidate>
                <div className={styles.paymentMethodGroup}>
                  <span className={styles.paymentMethodLabel}>Способ оплаты</span>
                  <label className={styles.paymentOptionContent}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="on_delivery"
                      checked={paymentMethod === 'on_delivery'}
                      onChange={() => setPaymentMethod('on_delivery')}
                    />
                    <span className={styles.paymentOptionCircle} />
                    <div className={styles.paymentOptionTextWrap}>
                      <span className={styles.paymentOptionTitle}>Оплата при получении</span>
                      <span className={styles.paymentOptionDesc}>Наличными или картой при получении</span>
                    </div>
                  </label>
                  <label className={styles.paymentOptionContent}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                    />
                    <span className={styles.paymentOptionCircle} />
                    <div className={styles.paymentOptionTextWrap}>
                      <span className={styles.paymentOptionTitle}>Оплата картой</span>
                      <span className={styles.paymentOptionDesc}>Онлайн картой (bePaid)</span>
                    </div>
                  </label>
                </div>
                {paymentMethod === 'on_delivery' && (
                  <>
                    <div className={styles.inputGroupWrap}>
                      <div className={`${styles.inputGroup} ${address.trim() ? styles.filled : ''}`}>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => { setAddress(e.target.value); setFieldError((prev) => (prev?.field === 'address' ? null : prev)); }}
                          required
                          autoComplete="off"
                          aria-invalid={fieldError?.field === 'address'}
                          aria-describedby={fieldError?.field === 'address' ? 'cart-field-error-address' : undefined}
                        />
                        <label>Адрес доставки <span className={styles.required}>*</span></label>
                      </div>
                      {fieldError?.field === 'address' && (
                        <FieldError message={fieldError.message} id="cart-field-error-address" />
                      )}
                    </div>
                    <div className={styles.inputGroupWrap}>
                      <div className={`${styles.inputGroup} ${phone.trim() ? styles.filled : ''}`}>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); setFieldError((prev) => (prev?.field === 'phone' ? null : prev)); }}
                          required
                          autoComplete="off"
                          aria-invalid={fieldError?.field === 'phone'}
                          aria-describedby={fieldError?.field === 'phone' ? 'cart-field-error-phone' : undefined}
                        />
                        <label>Телефон <span className={styles.required}>*</span></label>
                      </div>
                      {fieldError?.field === 'phone' && (
                        <FieldError message={fieldError.message} id="cart-field-error-phone" />
                      )}
                    </div>
                  </>
                )}
                {paymentMethod === 'card' && (
                  <>
                    <div className={`${styles.inputGroup} ${styles.inputGroupOptional} ${address.trim() ? styles.filled : ''}`}>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        autoComplete="off"
                      />
                      <label>Адрес доставки (опционально)</label>
                    </div>
                    <div className={`${styles.inputGroup} ${styles.inputGroupOptional} ${phone.trim() ? styles.filled : ''}`}>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="off"
                      />
                      <label>Телефон</label>
                    </div>
                  </>
                )}
                <div className={styles.totalBlock}>
                  <span className={styles.totalLabel}>Итого к оплате</span>
                  <span className={styles.totalSum}>{formatPrice(totalSum)}</span>
                </div>
                <button type="submit" disabled={loading || !user} className={styles.submitBtn}>
                  <span className={styles.submitBtnText}>
                    {loading ? 'Оформление...' : !user ? 'Войдите для оформления' : 'Оформить заказ'}
                  </span>
                  {user && !loading && (
                    <svg className={styles.submitBtnArrow} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>
              </form>
              {paymentMethod === 'on_delivery' && (
                <p className={styles.checkoutNote}>Оплата при получении. Укажите адрес и телефон — менеджер свяжется для уточнения.</p>
              )}
              {paymentMethod === 'card' && (
                <p className={styles.checkoutNote}>Оплата картой онлайн. Нажмите «Оформить заказ» — откроется форма оплаты (интеграция bePaid).</p>
              )}
            </div>
          </aside>
        </div>
      </div>
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalSum={formatPrice(totalSum)}
        onSubmit={handlePaymentSubmit}
      />
    </main>
  );
}
