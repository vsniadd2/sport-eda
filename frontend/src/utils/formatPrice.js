const CURRENCY = 'BYN';

export function formatPrice(price, suffix = '') {
  const value = Number(price);
  if (Number.isNaN(value)) return `0.00 ${CURRENCY}${suffix}`;
  return `${value.toFixed(2)} ${CURRENCY}${suffix}`;
}

export { CURRENCY };
