import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/formatPrice';
import { formatDateTimeLong } from '../../utils/formatDate';
import OrderStatusStepper from '../OrderStatusStepper/OrderStatusStepper';
import styles from './OrderDetailModal.module.css';

const BODY_CLASS = 'orderDetailModalOpen';

export default function OrderDetailModal({ order, onClose }) {
  useEffect(() => {
    if (order) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add(BODY_CLASS);
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove(BODY_CLASS);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove(BODY_CLASS);
    };
  }, [order]);

  useEffect(() => {
    if (!order) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [order, onClose]);

  if (!order) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const modalContent = (
    <div className={styles.overlay} onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="order-detail-title" className={styles.title}>Заказ №{order.id}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className={styles.body}>
          <OrderStatusStepper order={order} />
          <p className={styles.date}>
            {order.created_at ? formatDateTimeLong(order.created_at) : ''}
          </p>
          <p className={styles.line}><strong>Статус:</strong> {order.processed_at ? 'Готов к выдаче' : 'В обработке'}</p>
          <p className={styles.line}><strong>Оплата:</strong> при получении (самовывоз)</p>
          {(order.address || order.phone) && (
            <div className={styles.contacts}>
              {order.phone && <p className={styles.line}><strong>Телефон:</strong> {order.phone}</p>}
              {order.address && <p className={styles.line}><strong>Комментарий:</strong> {order.address}</p>}
            </div>
          )}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Товар</th>
                <th className={styles.thCenter}>Кол-во</th>
                <th className={styles.thRight}>Цена</th>
                <th className={styles.thRight}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={`${order.id}-${item.product_id}-${item.quantity}`}>
                  <td>
                    <Link to={`/catalog/${item.product_id}`} className={styles.productLink} onClick={onClose}>
                      {item.name || `Товар #${item.product_id}`}
                    </Link>
                  </td>
                  <td className={styles.tdCenter}>{item.quantity}</td>
                  <td className={styles.tdRight}>{formatPrice(item.price)}</td>
                  <td className={styles.tdRight}>{formatPrice((item.price || 0) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.total}>
            <strong>Итого:</strong> {formatPrice(order.total)}
          </p>
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.closeBottom} onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
