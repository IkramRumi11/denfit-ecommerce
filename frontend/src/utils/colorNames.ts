// Simple mapping of hex codes to human-friendly color names.
// Keys are stored as lowercase hex without leading '#'.
export const COLOR_NAME_MAP: Record<string, string> = {
  '000000': 'Black',
  '0a0a0a': 'Black',
  'ffffff': 'White',
  'fff9f2': 'Off White',
  'f5f5f5': 'Light Gray',
  '808080': 'Gray',
  '36454f': 'Charcoal',
  'ff0000': 'Red',
  '800000': 'Maroon',
  'ffc0cb': 'Pink',
  'ffa500': 'Orange',
  'ffff00': 'Yellow',
  '00ff00': 'Green',
  '008000': 'Green',
  '4b5320': 'Army Green',
  '808000': 'Olive Green',
  '0000ff': 'Blue',
  '000080': 'Navy Blue',
  '008080': 'Teal',
  '40e0d0': 'Turquoise',
  '800080': 'Purple',
  'e6e6fa': 'Lavender',
  '964b00': 'Brown',
  'c0c0c0': 'Silver',
  'ffd700': 'Gold',
  'f5f5dc': 'Beige',
  'f0e68c': 'Khaki',
  'fffdd0': 'Cream',
  'd2b48c': 'Tan'
};

export const COLOR_HEX_MAP: Record<string, string> = {
  'black': '#000000',
  'white': '#FFFFFF',
  'off white': '#FFF9F2',
  'light gray': '#F5F5F5',
  'light grey': '#F5F5F5',
  'gray': '#808080',
  'grey': '#808080',
  'charcoal': '#36454F',
  'red': '#FF0000',
  'maroon': '#800000',
  'pink': '#FFC0CB',
  'orange': '#FFA500',
  'yellow': '#FFFF00',
  'green': '#008000',
  'army green': '#4B5320',
  'olive green': '#808000',
  'olive': '#808000',
  'blue': '#0000FF',
  'navy blue': '#000080',
  'navy': '#000080',
  'teal': '#008080',
  'turquoise': '#40E0D0',
  'purple': '#800080',
  'lavender': '#E6E6FA',
  'brown': '#964B00',
  'silver': '#C0C0C0',
  'gold': '#FFD700',
  'beige': '#F5F5DC',
  'khaki': '#F0E68C',
  'cream': '#FFFDD0',
  'tan': '#D2B48C'
};

export function normalizeHex(input?: string | null): string | null {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('#')) s = s.slice(1);
  s = s.replace(/[^0-9a-f]/g, '');
  if (s.length === 3) {
    s = s.split('').map(ch => ch + ch).join('');
  }
  if (s.length === 6 && /^[0-9a-f]{6}$/.test(s)) return s;
  return null;
}

export function getColorName(input?: string | null): string {
  if (!input) return '';
  const hex = normalizeHex(input);
  if (hex) {
    const found = COLOR_NAME_MAP[hex];
    if (found) return found;
    return `#${hex.toUpperCase()}`;
  }
  const t = String(input).trim();
  if (/^#[0-9a-fA-F]{3,6}$/.test(t)) {
    return t;
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function resolveColorHex(input?: string | null): string | null {
  if (!input) return null;
  const t = String(input).trim().toLowerCase();
  const norm = normalizeHex(t);
  if (norm) return `#${norm.toUpperCase()}`;
  const found = COLOR_HEX_MAP[t];
  if (found) return found;
  return null;
}

export default getColorName;
