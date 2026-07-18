export function formatLabel(key: string | null | undefined): string {
  if (!key) return '';
  try {
    return String(key)
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch (e) {
    return String(key);
  }
}
