const TZ = 'Europe/Minsk';

export function formatDateTime(date, options = {}) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('ru-RU', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function formatDate(date, options = {}) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('ru-RU', {
    timeZone: TZ,
    ...options,
  });
}

export function formatDateTimeLong(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('ru-RU', {
    timeZone: TZ,
    dateStyle: 'long',
    timeStyle: 'short',
  });
}
