export type SizeGuideTemplate = {
  id: string;
  name: string;
  category: string; // clothing | accessories | kids | any
  description?: string;
  tableHtml?: string;
  image?: string;
};

const defaultTemplates: SizeGuideTemplate[] = [
  {
    id: 'clothing-default',
    name: 'Clothing - Standard (S,M,L,XL)',
    category: 'clothing',
    description: '<p>Use this guide for garments. Measurements are body measurements in cm.</p>',
    tableHtml: `
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th class="text-left py-2 px-3 border-b">Size</th>
            <th class="text-left py-2 px-3 border-b">Chest (cm)</th>
            <th class="text-left py-2 px-3 border-b">Waist (cm)</th>
            <th class="text-left py-2 px-3 border-b">Hip (cm)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="py-2 px-3 border-b">S</td><td class="py-2 px-3 border-b">88-92</td><td class="py-2 px-3 border-b">72-76</td><td class="py-2 px-3 border-b">90-94</td></tr>
          <tr><td class="py-2 px-3 border-b">M</td><td class="py-2 px-3 border-b">96-100</td><td class="py-2 px-3 border-b">80-84</td><td class="py-2 px-3 border-b">98-102</td></tr>
          <tr><td class="py-2 px-3 border-b">L</td><td class="py-2 px-3 border-b">104-108</td><td class="py-2 px-3 border-b">88-92</td><td class="py-2 px-3 border-b">106-110</td></tr>
          <tr><td class="py-2 px-3">XL</td><td class="py-2 px-3">112-116</td><td class="py-2 px-3">96-100</td><td class="py-2 px-3">114-118</td></tr>
        </tbody>
      </table>
    `,
  },
  {
    id: 'accessories-default',
    name: 'Accessories (Belts, Hats) - One size guidance',
    category: 'accessories',
    description: '<p>Accessories sizing guidance. Provide measurements where applicable.</p>',
    tableHtml: `
      <table class="w-full text-sm border-collapse">
        <thead><tr><th class="text-left py-2 px-3 border-b">Item</th><th class="text-left py-2 px-3 border-b">Measurement</th></tr></thead>
        <tbody>
          <tr><td class="py-2 px-3 border-b">Belt</td><td class="py-2 px-3 border-b">Measure from buckle to middle hole</td></tr>
          <tr><td class="py-2 px-3">Hat</td><td class="py-2 px-3">Head circumference in cm</td></tr>
        </tbody>
      </table>
    `,
  },
  {
    id: 'kids-default',
    name: 'Kids - Age/Height based',
    category: 'kids',
    description: '<p>Kids sizes usually correspond to age and height ranges.</p>',
    tableHtml: `
      <table class="w-full text-sm border-collapse">
        <thead><tr><th class="text-left py-2 px-3 border-b">Size (Age)</th><th class="text-left py-2 px-3 border-b">Height (cm)</th></tr></thead>
        <tbody>
          <tr><td class="py-2 px-3 border-b">2-3 yrs</td><td class="py-2 px-3 border-b">92-98</td></tr>
          <tr><td class="py-2 px-3 border-b">4-5 yrs</td><td class="py-2 px-3 border-b">102-110</td></tr>
          <tr><td class="py-2 px-3">6-7 yrs</td><td class="py-2 px-3">116-122</td></tr>
        </tbody>
      </table>
    `,
  }
];

// simple storage helper using localStorage to persist admin-created templates
const STORAGE_KEY = 'sizeGuideTemplates:v1';

export function loadTemplates(): SizeGuideTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTemplates;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTemplates;
    return parsed;
  } catch (e) {
    return defaultTemplates;
  }
}

export function saveTemplates(templates: SizeGuideTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    // ignore
  }
}

export default defaultTemplates;
