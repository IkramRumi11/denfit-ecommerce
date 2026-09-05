// frontend/src/utils/brandConstants.ts

export interface CuratedBrand {
  name: string;
  category: 'House Brand' | 'Global Brands' | 'Pakistani Fashion';
  isFeatured?: boolean;
}

export const CURATED_BRANDS: CuratedBrand[] = [
  // House Brand
  { name: 'DENFiT', category: 'House Brand', isFeatured: true },

  // Global Activewear & Fashion Brands
  { name: 'Nike', category: 'Global Brands' },
  { name: 'Adidas', category: 'Global Brands' },
  { name: 'Puma', category: 'Global Brands' },
  { name: 'Under Armour', category: 'Global Brands' },
  { name: 'Gymshark', category: 'Global Brands' },
  { name: 'Lululemon', category: 'Global Brands' },
  { name: "Levi's", category: 'Global Brands' },
  { name: 'Zara', category: 'Global Brands' },
  { name: 'H&M', category: 'Global Brands' },
  { name: 'Uniqlo', category: 'Global Brands' },
  { name: 'Calvin Klein', category: 'Global Brands' },
  { name: 'Tommy Hilfiger', category: 'Global Brands' },
  { name: 'Ralph Lauren', category: 'Global Brands' },
  { name: 'Reebok', category: 'Global Brands' },
  { name: 'New Balance', category: 'Global Brands' },
  { name: 'Vans', category: 'Global Brands' },
  { name: 'Converse', category: 'Global Brands' },
  { name: 'Diesel', category: 'Global Brands' },

  // Pakistani & Regional Fashion Brands
  { name: 'Outfitters', category: 'Pakistani Fashion' },
  { name: 'Breakout', category: 'Pakistani Fashion' },
  { name: 'Gul Ahmed', category: 'Pakistani Fashion' },
  { name: 'Sapphire', category: 'Pakistani Fashion' },
  { name: 'Khaadi', category: 'Pakistani Fashion' },
  { name: 'Limelight', category: 'Pakistani Fashion' },
  { name: 'J.', category: 'Pakistani Fashion' },
  { name: 'Bonanza Satrangi', category: 'Pakistani Fashion' },
  { name: 'Charcoal', category: 'Pakistani Fashion' },
  { name: 'Monark', category: 'Pakistani Fashion' },
  { name: 'Engine', category: 'Pakistani Fashion' },
  { name: 'Cougar', category: 'Pakistani Fashion' },
  { name: 'Cheetah', category: 'Pakistani Fashion' },
  { name: 'Royal Tag', category: 'Pakistani Fashion' },
  { name: 'Diners', category: 'Pakistani Fashion' },
  { name: 'Cambridge', category: 'Pakistani Fashion' },
  { name: 'Zellbury', category: 'Pakistani Fashion' },
  { name: 'Edenrobe', category: 'Pakistani Fashion' },
];

const BRAND_LOOKUP_MAP = new Map<string, string>();
CURATED_BRANDS.forEach((b) => {
  const cleanKey = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  BRAND_LOOKUP_MAP.set(cleanKey, b.name);
  BRAND_LOOKUP_MAP.set(b.name.toLowerCase(), b.name);
});

const BRAND_ALIASES: Record<string, string> = {
  denfit: 'DENFiT',
  'den fit': 'DENFiT',
  nike: 'Nike',
  adidas: 'Adidas',
  puma: 'Puma',
  levis: "Levi's",
  "levi's": "Levi's",
  'levi strauss': "Levi's",
  hm: 'H&M',
  'h&m': 'H&M',
  'h and m': 'H&M',
  'junaid jamshed': 'J.',
  'j.': 'J.',
  'j dot': 'J.',
  underarmour: 'Under Armour',
  'under armour': 'Under Armour',
  outfitters: 'Outfitters',
  breakout: 'Breakout',
  gulahmed: 'Gul Ahmed',
  'gul ahmed': 'Gul Ahmed',
  sapphire: 'Sapphire',
  khaadi: 'Khaadi',
  limelight: 'Limelight',
  bonanza: 'Bonanza Satrangi',
  'bonanza satrangi': 'Bonanza Satrangi',
  charcoal: 'Charcoal',
  monark: 'Monark',
  engine: 'Engine',
  cougar: 'Cougar',
  'royal tag': 'Royal Tag',
  diners: 'Diners',
  cambridge: 'Cambridge',
  zellbury: 'Zellbury',
  edenrobe: 'Edenrobe',
};

Object.entries(BRAND_ALIASES).forEach(([alias, canonical]) => {
  BRAND_LOOKUP_MAP.set(alias.toLowerCase().trim(), canonical);
  BRAND_LOOKUP_MAP.set(alias.toLowerCase().replace(/[^a-z0-9]/g, ''), canonical);
});

export const normalizeBrandName = (input?: string): string => {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9]/g, '');

  if (BRAND_LOOKUP_MAP.has(lower)) {
    return BRAND_LOOKUP_MAP.get(lower)!;
  }
  if (BRAND_LOOKUP_MAP.has(stripped)) {
    return BRAND_LOOKUP_MAP.get(stripped)!;
  }

  // Preserve manual / custom brand as entered (capitalizing first letter if all lowercase)
  if (trimmed === trimmed.toLowerCase()) {
    return trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return trimmed;
};

export const getCuratedBrands = (): CuratedBrand[] => CURATED_BRANDS;
