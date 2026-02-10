import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './PaymentModal.module.css';

export default function PaymentModal({ isOpen, onClose, totalSum, onSubmit }) {
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const digits = cardNumber.replace(/\D/g, '');
      await onSubmit({
        card_holder: cardHolder.trim(),
        card_number: digits,
        expiry: expiry.trim(),
        cvv: cvv.trim(),
        card_last4: digits.length >= 4 ? digits.slice(-4) : '',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Оплата картой {totalSum != null ? ` · ${totalSum}` : ''}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Закрыть"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.cardForm}>
            <div className={styles.inputContainer}>
              <label htmlFor="payment-card-holder" className={styles.inputLabel}>
                Имя владельца карты
              </label>
              <input
                id="payment-card-holder"
                className={styles.inputField}
                type="text"
                placeholder="Как на карте"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                autoComplete="cc-name"
              />
            </div>
            <div className={styles.inputContainer}>
              <label htmlFor="payment-card-number" className={styles.inputLabel}>
                Номер карты
              </label>
              <input
                id="payment-card-number"
                className={styles.inputField}
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                  setCardNumber(v.replace(/(\d{4})/g, '$1 ').trim());
                }}
                autoComplete="cc-number"
              />
            </div>
            <div className={styles.inputContainer}>
              <label htmlFor="payment-expiry" className={styles.inputLabel}>
                Срок действия / CVV
              </label>
              <div className={styles.split}>
                <input
                  id="payment-expiry"
                  className={styles.inputField}
                  type="text"
                  placeholder="ММ/ГГ"
                  value={expiry}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
                    setExpiry(v);
                  }}
                  autoComplete="cc-exp"
                />
                <input
                  id="payment-cvv"
                  className={styles.inputField}
                  type="text"
                  inputMode="numeric"
                  placeholder="CVV"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  autoComplete="cc-csc"
                />
              </div>
            </div>
          </div>
          <button type="submit" className={styles.purchaseBtn} disabled={loading}>
            {loading ? 'Обработка...' : 'Оплатить'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
