import { useState, useCallback, useEffect, useRef } from 'react';
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
  const paymentMethodRef = useRef('on_delivery');
  useEffect(() => {
    paymentMethodRef.current = paymentMethod;
  }, [paymentMethod]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const submitOrder = useCallback(
    async (paymentCardData = null) => {
      const method = paymentMethodRef.current ?? 'on_delivery';
      const payload = {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        address: address.trim() || null,
        phone: phone.trim() || null,
        payment_method: method,
      };
      if (method === 'card' && paymentCardData?.card_last4) {
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
    [items, address, phone, clearCart, notify]
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
      if (!phone.trim()) {
        setFieldError({ field: 'phone', message: 'Заполните это поле.' });
        return;
      }
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
                      <span className={styles.paymentOptionDesc}>Самовывоз: забронируйте заказ, оплата при получении</span>
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
                <div className={styles.inputGroupWrap}>
                  <div className={`${styles.inputGroup} ${phone.trim() ? styles.filled : ''}`}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setFieldError((prev) => (prev?.field === 'phone' ? null : prev)); }}
                      required
                      autoComplete="tel"
                      aria-invalid={fieldError?.field === 'phone'}
                      aria-describedby={fieldError?.field === 'phone' ? 'cart-field-error-phone' : undefined}
                    />
                    <label>Телефон <span className={styles.required}>*</span></label>
                  </div>
                  {fieldError?.field === 'phone' && (
                    <FieldError message={fieldError.message} id="cart-field-error-phone" />
                  )}
                </div>
                <div className={`${styles.inputGroup} ${styles.inputGroupOptional} ${address.trim() ? styles.filled : ''}`}>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="off"
                  />
                  <label>Комментарий (необ.)</label>
                </div>
                <div className={styles.totalBlock}>
                  <span className={styles.totalLabel}>Итого к оплате</span>
                  <span className={styles.totalSum}>{formatPrice(totalSum)}</span>
                </div>
                <button type="submit" disabled={loading || !user} className={styles.submitBtn}>
                  <span className={styles.submitBtnText}>
                    {loading ? 'Оформление...' : !user ? 'Войдите для оформления' : 'Оформить заказ'}
                  </span>
                  <span className={styles.submitBtnSvg} aria-hidden>
                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="20" viewBox="0 0 38 15" fill="none">
                      <path fill="currentColor" d="M10 7.519l-.939-.344h0l.939.344zm14.386-1.205l-.981-.192.981.192zm1.276 5.509l.537.843.148-.094.107-.139-.792-.611zm4.819-4.304l-.385-.923h0l.385.923zm7.227.707a1 1 0 0 0 0-1.414L31.343.448a1 1 0 0 0-1.414 0 1 1 0 0 0 0 1.414l5.657 5.657-5.657 5.657a1 1 0 0 0 1.414 1.414l6.364-6.364zM1 7.519l.554.833.029-.019.094-.061.361-.23 1.277-.77c1.054-.609 2.397-1.32 3.629-1.787.617-.234 1.17-.392 1.623-.455.477-.066.707-.008.788.034.025.013.031.021.039.034a.56.56 0 0 1 .058.235c.029.327-.047.906-.39 1.842l1.878.689c.383-1.044.571-1.949.505-2.705-.072-.815-.45-1.493-1.16-1.865-.627-.329-1.358-.332-1.993-.244-.659.092-1.367.305-2.056.566-1.381.523-2.833 1.297-3.921 1.925l-1.341.808-.385.245-.104.068-.028.018c-.011.007-.011.007.543.84zm8.061-.344c-.198.54-.328 1.038-.36 1.484-.032.441.024.94.325 1.364.319.45.786.64 1.21.697.403.054.824-.001 1.21-.09.775-.179 1.694-.566 2.633-1.014l3.023-1.554c2.115-1.122 4.107-2.168 5.476-2.524.329-.086.573-.117.742-.115s.195.038.161.014c-.15-.105.085-.139-.076.685l1.963.384c.192-.98.152-2.083-.74-2.707-.405-.283-.868-.37-1.28-.376s-.849.069-1.274.179c-1.65.43-3.888 1.621-5.909 2.693l-2.948 1.517c-.92.439-1.673.743-2.221.87-.276.064-.429.065-.492.057-.043-.006.066.003.155.127.07.099.024.131.038-.063.014-.187.078-.49.243-.94l-1.878-.689zm14.343-1.053c-.361 1.844-.474 3.185-.413 4.161.059.95.294 1.72.811 2.215.567.544 1.242.546 1.664.459a2.34 2.34 0 0 0 .502-.167l.15-.076.049-.028.018-.011c.013-.008.013-.008-.524-.852l-.536-.844.019-.012c-.038.018-.064.027-.084.032-.037.008.053-.013.125.056.021.02-.151-.135-.198-.895-.046-.734.034-1.887.38-3.652l-1.963-.384zm2.257 5.701l.791.611.024-.031.08-.101.311-.377 1.093-1.213c.922-.954 2.005-1.894 2.904-2.27l-.771-1.846c-1.31.547-2.637 1.758-3.572 2.725l-1.184 1.314-.341.414-.093.117-.025.032c-.01.013-.01.013.781.624zm5.204-3.381c.989-.413 1.791-.42 2.697-.307.871.108 2.083.385 3.437.385v-2c-1.197 0-2.041-.226-3.19-.369-1.114-.139-2.297-.146-3.715.447l.771 1.846z" />
                    </svg>
                  </span>
                </button>
              </form>
              {paymentMethod === 'on_delivery' && (
                <p className={styles.checkoutNote}>Самовывоз: заказ бронируется, оплата при получении. Менеджер свяжется по телефону.</p>
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
