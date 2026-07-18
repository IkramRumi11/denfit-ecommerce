export const RESERVED_FILTER_SLUGS = [
  'page',
  'limit',
  'sort',
  'search',
  'category',
  'categories',
  'sizes',
  'colors',
  'minPrice',
  'maxPrice',
  'rating',
  'brand',
  'brandSlug',
  'gender',
  'price',
  'availability',
  'attributes',
  'productType',
  'sizeProfile'
];

export const isReservedFilterSlug = (slug) => {
  if (!slug) return false;
  return RESERVED_FILTER_SLUGS.includes(String(slug).toLowerCase());
};
