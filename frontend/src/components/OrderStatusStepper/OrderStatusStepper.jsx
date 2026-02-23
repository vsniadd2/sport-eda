import { useMemo } from 'react';
import { formatDateTimeLong } from '../../utils/formatDate';
import styles from './OrderStatusStepper.module.css';

const STATUS_LABELS = {
  completed: 'Выполнено',
  active: 'В процессе',
  pending: 'Ожидается',
};

function CheckIcon() {
  return (
    <svg className={styles.checkIcon} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
    </svg>
  );
}

export default function OrderStatusStepper({ order }) {
  const steps = useMemo(() => {
    if (!order) return [];
    const processed = !!order.processed_at;
    const isCard = order.payment_method === 'card';
    const isPaid = order.payment_status === 'paid';

    const step1 = {
      key: 'placed',
      status: 'completed',
      title: 'Заказ оформлен',
      time: order.created_at,
    };

    // Оплата картой: шаг "Оплата" (ожидание/выполнено). Бронирование: шаг "Бронирование" (всегда выполнено).
    const step2 = isCard
      ? {
          key: 'payment',
          status: isPaid ? 'completed' : 'active',
          title: 'Оплата',
          time: isPaid ? (order.paid_at || order.created_at) : null,
          timeLabel: isPaid ? null : 'Ожидается оплата',
        }
      : {
          key: 'booking',
          status: 'completed',
          title: 'Бронирование',
          time: order.created_at,
          timeLabel: 'Оплата при получении',
        };

    // После оплаты (или при «оплата при получении») показываем «Обработка» сразу выполненной
    const processingDone = processed || isPaid || !isCard;
    const step3 = {
      key: 'processing',
      status: processingDone ? 'completed' : 'pending',
      title: 'Обработка',
      time: processed ? order.processed_at : (isPaid || !isCard) ? (order.paid_at || order.created_at) : null,
      timeLabel: !processingDone ? 'Ожидается' : null,
    };

    return [step1, step2, step3];
  }, [order]);

  if (!order || steps.length === 0) return null;

  return (
    <div className={styles.box}>
      {steps.map((step) => (
        <div key={step.key} className={`${styles.step} ${styles[step.status]}`}>
          <div className={styles.line} aria-hidden />
          <div className={styles.circle}>
            {step.status === 'completed' ? <CheckIcon /> : steps.indexOf(step) + 1}
          </div>
          <div className={styles.content}>
            <div className={styles.title}>{step.title}</div>
            <div className={styles.status}>{STATUS_LABELS[step.status]}</div>
            <div className={styles.time}>
              {step.time ? formatDateTimeLong(step.time) : step.timeLabel || '—'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
