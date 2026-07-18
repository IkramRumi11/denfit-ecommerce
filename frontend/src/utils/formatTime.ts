export const formatRelativeTime = (inputDate?: string | number | Date): string => {
  if (!inputDate) return '';
  const date = typeof inputDate === 'string' || typeof inputDate === 'number' ? new Date(inputDate) : inputDate;
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const absSeconds = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(typeof navigator !== 'undefined' ? navigator.language : 'en', { numeric: 'auto' });

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(seconds / 86400);
  const weeks = Math.floor(seconds / 604800);
  const months = Math.floor(seconds / 2592000);
  const years = Math.floor(seconds / 31536000);

  if (absSeconds < 60) return rtf.format(-absSeconds, 'second');
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  if (Math.abs(days) < 7) return rtf.format(-days, 'day');
  if (Math.abs(weeks) < 5) return rtf.format(-weeks, 'week');
  if (Math.abs(months) < 12) return rtf.format(-months, 'month');
  return rtf.format(-years, 'year');
};

export default formatRelativeTime;
