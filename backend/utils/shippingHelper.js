import SystemSetting from '../models/SystemSetting.js';

export const DEFAULT_SHIPPING_CONFIG = {
  shippingFee: 300,
  freeShippingThreshold: 5000,
  isFreeShippingEnabled: true,
  isShippingEnabled: true,
  estimatedDeliveryDays: '5-7 business days'
};

let cachedConfig = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

/**
 * Fetch the active shipping configuration from SystemSetting or fallback to defaults
 */
export async function getShippingConfig() {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  try {
    const setting = await SystemSetting.findOne({ key: 'shipping_config', enabled: true }).lean();
    if (setting && setting.value && typeof setting.value === 'object') {
      const val = setting.value;
      cachedConfig = {
        shippingFee: (typeof val.shippingFee === 'number' && val.shippingFee >= 0) ? Number(val.shippingFee) : DEFAULT_SHIPPING_CONFIG.shippingFee,
        freeShippingThreshold: (typeof val.freeShippingThreshold === 'number' && val.freeShippingThreshold >= 0) ? Number(val.freeShippingThreshold) : DEFAULT_SHIPPING_CONFIG.freeShippingThreshold,
        isFreeShippingEnabled: typeof val.isFreeShippingEnabled === 'boolean' ? val.isFreeShippingEnabled : DEFAULT_SHIPPING_CONFIG.isFreeShippingEnabled,
        isShippingEnabled: typeof val.isShippingEnabled === 'boolean' ? val.isShippingEnabled : DEFAULT_SHIPPING_CONFIG.isShippingEnabled,
        estimatedDeliveryDays: typeof val.estimatedDeliveryDays === 'string' && val.estimatedDeliveryDays.trim() ? val.estimatedDeliveryDays.trim() : DEFAULT_SHIPPING_CONFIG.estimatedDeliveryDays
      };
    } else {
      cachedConfig = { ...DEFAULT_SHIPPING_CONFIG };
    }
  } catch (err) {
    console.warn('Failed to fetch shipping_config setting, using default:', err?.message || err);
    cachedConfig = { ...DEFAULT_SHIPPING_CONFIG };
  }

  cacheExpiry = now + CACHE_TTL_MS;
  return cachedConfig;
}

/**
 * Clear the in-memory cache when Admin updates shipping configuration
 */
export function clearShippingCache() {
  cachedConfig = null;
  cacheExpiry = 0;
}

/**
 * Calculate shipping fee based on discounted subtotal and shipping configuration
 * @param {number} discountedSubtotal - Order subtotal after subtracting any promo code discount
 * @param {object} [config] - Optional shipping configuration
 * @returns {number} The calculated shipping fee (0 or configured amount)
 */
export function calculateShippingFee(discountedSubtotal, config = DEFAULT_SHIPPING_CONFIG) {
  const subtotal = Math.max(0, Number(discountedSubtotal) || 0);

  // If shipping is disabled globally or fee is 0, delivery is completely free
  if (config.isShippingEnabled === false || (Number(config.shippingFee) || 0) <= 0) {
    return 0;
  }

  // If free shipping threshold is enabled and discounted subtotal meets or exceeds threshold
  if (config.isFreeShippingEnabled !== false && subtotal >= (Number(config.freeShippingThreshold) || 0)) {
    return 0;
  }

  // Otherwise, apply standard shipping fee
  return Math.round((Number(config.shippingFee) || 0) * 100) / 100;
}

/**
 * Dynamically replace hardcoded shipping numbers in messages if the message is shipping-related.
 * Unrelated messages are returned unmodified.
 */
export function interpolateShippingMessage(text, config = DEFAULT_SHIPPING_CONFIG) {
  if (!text || typeof text !== 'string') return text;

  const isShippingRelated = /(free\s*shipping|free\s*delivery|shipping\s*fee|delivery\s*fee|delivery\s*charges|shipping\s*charges)/i.test(text);
  if (!isShippingRelated) {
    return text;
  }

  const threshold = (Number(config.freeShippingThreshold) || 0).toLocaleString();
  const fee = (Number(config.shippingFee) || 0).toLocaleString();

  // If free shipping is disabled completely
  if (config.isShippingEnabled === false) {
    return '📢 Free shipping on all orders';
  }

  if (config.isFreeShippingEnabled === false) {
    return `📢 Standard delivery Rs. ${fee} across Pakistan`;
  }

  // Replace threshold numbers like 5,000 or 5000 in "orders over / above / exceeding"
  let updated = text.replace(/(orders\s+(?:over|above|exceeding|from)\s+)(?:Rs\.?|₨|PKR)?\s*[\d,]+/gi, `$1Rs. ${threshold}`);

  // Replace phrases like "free delivery over Rs 5,000"
  updated = updated.replace(/(free\s+(?:shipping|delivery)\s+(?:over|above|from|on orders over)\s+)(?:Rs\.?|₨|PKR)?\s*[\d,]+/gi, `$1Rs. ${threshold}`);

  return updated;
}
