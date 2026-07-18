// frontend/src/utils/color.ts
export function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => {
    const h = n.toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function parseColor(input: string): { valid: boolean; css: string | null; hex: string | null } {
  if (!input || typeof window === 'undefined') return { valid: false, css: null, hex: null };
  const el = document.createElement('div');
  el.style.color = '';
  el.style.color = input;
  // Must be attached to DOM for computed style to work reliably
  el.style.display = 'none';
  document.body.appendChild(el);
  const cs = getComputedStyle(el).color;
  document.body.removeChild(el);
  if (!cs || cs === 'rgba(0, 0, 0, 0)' || cs === 'transparent') {
    return { valid: false, css: null, hex: null };
  }
  // cs is like 'rgb(r, g, b)' or 'rgba(r, g, b, a)'
  const m = cs.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
  if (m) {
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    const hex = rgbToHex(r, g, b);
    return { valid: true, css: cs, hex };
  }
  // If computed style returned other format, just return it as css
  return { valid: true, css: cs, hex: null };
}

export default parseColor;
