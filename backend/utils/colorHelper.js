// backend/utils/colorHelper.js

export const COLOR_NAME_MAP = {
  // Blacks & Grays
  '000000': 'Black',
  '0a0a0a': 'Black',
  '111111': 'Jet Black',
  '1a1a1a': 'Ebony',
  '222222': 'Onyx',
  '2b2b2b': 'Charcoal',
  '333333': 'Dark Charcoal',
  '36454f': 'Charcoal',
  '4a4a4a': 'Dark Gray',
  '555555': 'Granite',
  '696969': 'Dim Gray',
  '708090': 'Slate Gray',
  '778899': 'Light Slate Gray',
  '808080': 'Gray',
  '888888': 'Medium Gray',
  'a9a9a9': 'Dark Silver',
  'bebebe': 'Gray',
  'c0c0c0': 'Silver',
  'd3d3d3': 'Light Gray',
  'dcdcdc': 'Gainsboro',
  'e0e0e0': 'Platinum',
  'e5e5e5': 'Light Ash',
  'ededed': 'Pale Gray',
  'f5f5f5': 'Light Gray',
  'f8f9fa': 'Ghost White',
  'fafafa': 'Alabaster',
  'ffffff': 'White',

  // Whites & Neutrals / Beiges / Golds
  'fff9f2': 'Off White',
  'fffaf0': 'Floral White',
  'fdf5e6': 'Old Lace',
  'faf0e6': 'Linen',
  'faebd7': 'Antique White',
  'ffefd5': 'Papaya Whip',
  'ffebcd': 'Blanched Almond',
  'ffe4c4': 'Bisque',
  'f5f5dc': 'Beige',
  'fffdd0': 'Cream',
  'fdfd96': 'Pastel Yellow',
  'f0e68c': 'Khaki',
  'e6dbb8': 'Sand',
  'd2b48c': 'Tan',
  'c2b280': 'Sand Khaki',
  'bc8f8f': 'Rosy Brown',
  'deb887': 'Burlywood',
  'f4a460': 'Sandy Brown',
  'cd853f': 'Peru Brown',
  'b8860b': 'Dark Goldenrod',
  'daa520': 'Goldenrod',
  'd4af37': 'Gold',
  'ffd700': 'Gold',
  'ffdf00': 'Golden Yellow',
  'ffe5b4': 'Peach',
  'ffdab9': 'Peach Puff',
  'ffdead': 'Navajo White',
  'e5e0d8': 'Oatmeal',
  'c5a059': 'Metallic Gold',
  'b76e79': 'Rose Gold',
  'e6c280': 'Champagne',
  'edd59e': 'Champagne Gold',

  // Browns & Earth Tones
  '8b4513': 'Saddle Brown',
  'a0522d': 'Sienna',
  '654321': 'Dark Brown',
  '795548': 'Brown',
  '8d6e63': 'Coffee Brown',
  '5c4033': 'Dark Coffee',
  '3e2723': 'Espresso',
  '4e3629': 'Chocolate',
  '964b00': 'Brown',
  'a52a2a': 'Auburn',
  '800000': 'Maroon',
  '800020': 'Burgundy',
  '722f37': 'Wine',
  '4a0e17': 'Deep Wine',
  '58111a': 'Oxblood',
  '8b0000': 'Dark Red',
  'a91b0d': 'Rust Red',
  'b22222': 'Firebrick',
  'cb4154': 'Brick Red',

  // Reds & Pinks
  'ff0000': 'Red',
  'dc143c': 'Crimson',
  'ff2400': 'Scarlet',
  'e60000': 'Bright Red',
  'c41e3a': 'Cardinal Red',
  'e32636': 'Rose Red',
  'ff6347': 'Tomato',
  'ff4500': 'Orange Red',
  'ff7f50': 'Coral',
  'f08080': 'Light Coral',
  'fa8072': 'Salmon',
  'e9967a': 'Dark Salmon',
  'ff69b4': 'Hot Pink',
  'ff1493': 'Deep Pink',
  'ffc0cb': 'Pink',
  'ffb6c1': 'Light Pink',
  'db7093': 'Pale Violet Red',
  'c71585': 'Medium Violet Red',
  'd87093': 'Dusty Rose',
  'f4c2c2': 'Baby Pink',
  'e0115f': 'Ruby',
  'de3163': 'Cerise',
  'fc8eac': 'Flamingo Pink',

  // Oranges & Yellows
  'ffa500': 'Orange',
  'ff8c00': 'Dark Orange',
  'ff7518': 'Pumpkin Orange',
  'e67e22': 'Carrot Orange',
  'ff9900': 'Amber Orange',
  'ffbf00': 'Amber',
  'ffff00': 'Yellow',
  'ffea00': 'Bright Yellow',
  'ffd800': 'Lemon Yellow',
  'ffef00': 'Canary Yellow',
  'fff700': 'Neon Yellow',
  'fffacd': 'Lemon Chiffon',
  'fefe22': 'Laser Lemon',
  'eee8aa': 'Pale Goldenrod',
  'fafad2': 'Light Goldenrod',
  'cc7722': 'Ochre',
  'b5651d': 'Caramel',

  // Greens
  '00ff00': 'Lime Green',
  '32cd32': 'Lime',
  '00e676': 'Bright Green',
  '008000': 'Green',
  '228b22': 'Forest Green',
  '006400': 'Dark Green',
  '2e8b57': 'Sea Green',
  '3cb371': 'Medium Sea Green',
  '20b2aa': 'Light Sea Green',
  '00ff7f': 'Spring Green',
  '00fa9a': 'Medium Spring Green',
  '7fff00': 'Chartreuse',
  '7cfc00': 'Lawn Green',
  'adff2f': 'Green Yellow',
  '9acd32': 'Yellow Green',
  '6b8e23': 'Olive Drab',
  '556b2f': 'Dark Olive Green',
  '808000': 'Olive',
  '4b5320': 'Army Green',
  '355e3b': 'Hunter Green',
  '0b6623': 'Forest Green',
  '50c878': 'Emerald',
  '2ecc71': 'Emerald Green',
  '98ff98': 'Mint Green',
  '8fbc8f': 'Dark Sea Green',
  '66cdaa': 'Medium Aquamarine',
  '7fffd4': 'Aquamarine',
  'a3c1ad': 'Sage Green',
  '87a96b': 'Asparagus',
  '4f7942': 'Fern Green',
  '2f4f4f': 'Dark Slate Gray',

  // Cyans & Blues
  '00ffff': 'Cyan',
  '00e5ff': 'Bright Cyan',
  '40e0d0': 'Turquoise',
  '48d1cc': 'Medium Turquoise',
  'afeeee': 'Pale Turquoise',
  '00ced1': 'Dark Turquoise',
  '008080': 'Teal',
  '005f73': 'Deep Teal',
  '008b8b': 'Dark Cyan',
  '5f9ea0': 'Cadet Blue',
  '4682b4': 'Steel Blue',
  'b0c4de': 'Light Steel Blue',
  'add8e6': 'Light Blue',
  'b0e0e6': 'Powder Blue',
  '87ceeb': 'Sky Blue',
  '87cefa': 'Light Sky Blue',
  '00bfff': 'Deep Sky Blue',
  '1e90ff': 'Dodger Blue',
  '4169e1': 'Royal Blue',
  '0000ff': 'Blue',
  '0000cd': 'Medium Blue',
  '00008b': 'Dark Blue',
  '000080': 'Navy Blue',
  '002147': 'Oxford Navy',
  '191970': 'Midnight Blue',
  '0a235c': 'Deep Navy',
  '1b365d': 'Classic Navy',
  '2b3990': 'Ocean Navy',
  '3f51b5': 'Indigo Blue',
  '4b0082': 'Indigo',
  '6495ed': 'Cornflower Blue',
  '7b68ee': 'Medium Slate Blue',

  // Purples & Violets
  '800080': 'Purple',
  '8a2be2': 'Blue Violet',
  '9370db': 'Medium Purple',
  '9400d3': 'Dark Violet',
  '9932cc': 'Dark Orchid',
  'ba55d3': 'Medium Orchid',
  'da70d6': 'Orchid',
  'ee82ee': 'Violet',
  'dda0dd': 'Plum',
  'd8bfd8': 'Thistle',
  'e6e6fa': 'Lavender',
  '663399': 'Rebecca Purple',
  '483d8b': 'Dark Slate Blue',
  '6a5acd': 'Slate Blue',
  '8b008b': 'Dark Magenta',
  'ff00ff': 'Magenta',
  'df73ff': 'Heliotrope',
  '9b59b6': 'Amethyst',
  '5c2c77': 'Deep Purple'
};

export const COLOR_HEX_MAP = Object.entries(COLOR_NAME_MAP).reduce((acc, [hex, name]) => {
  const lower = name.toLowerCase();
  if (!acc[lower]) acc[lower] = `#${hex.toUpperCase()}`;
  return acc;
}, {
  'black': '#000000',
  'white': '#FFFFFF',
  'off white': '#FFF9F2',
  'navy': '#000080',
  'navy blue': '#000080',
  'olive': '#808000',
  'olive green': '#808000',
  'gold': '#D4AF37',
  'grey': '#808080',
  'gray': '#808080'
});

export function normalizeHex(input) {
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

// Convert 6-char hex to RGB tuple
function hexToRgb(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

// Find nearest named color using Euclidean distance in RGB space
function findClosestColorName(hex) {
  const [r, g, b] = hexToRgb(hex);
  let minDistance = Infinity;
  let closestName = 'Custom Color';

  for (const [mapHex, name] of Object.entries(COLOR_NAME_MAP)) {
    const [mr, mg, mb] = hexToRgb(mapHex);
    const dist = (r - mr) ** 2 + (g - mg) ** 2 + (b - mb) ** 2;
    if (dist < minDistance) {
      minDistance = dist;
      closestName = name;
      if (dist === 0) break;
    }
  }

  return closestName;
}

export function getColorName(input) {
  if (!input) return '';
  const str = String(input).trim();
  if (!str) return '';

  // Ignore internal temp / variant IDs like 'var-0', 'v1', 'col-0', etc.
  if (/^(var|color|col|v)[-_0-9]+$/i.test(str)) {
    return '';
  }

  // Check if input is a hex code
  const hex = normalizeHex(str);
  if (hex) {
    const exact = COLOR_NAME_MAP[hex];
    if (exact) return exact;
    return findClosestColorName(hex);
  }

  // If input starts with # or is hex-like
  if (/^#[0-9a-fA-F]{3,6}$/.test(str)) {
    const norm = normalizeHex(str);
    if (norm) return findClosestColorName(norm);
  }

  // Clean string that might have hex codes in parentheses or trailing hex
  const cleaned = str.replace(/#?[0-9a-fA-F]{6}/gi, '').replace(/[()#_-]/g, ' ').trim();
  const target = cleaned || str;

  // Title case the natural name
  return target
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function resolveColorHex(input) {
  if (!input) return null;
  const t = String(input).trim().toLowerCase();
  const norm = normalizeHex(t);
  if (norm) return `#${norm.toUpperCase()}`;
  const found = COLOR_HEX_MAP[t];
  if (found) return found;
  return null;
}

export default getColorName;
