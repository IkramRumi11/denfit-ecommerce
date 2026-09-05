export interface ShippingConfig {
  shippingFee: number;
  freeShippingThreshold: number;
  isFreeShippingEnabled: boolean;
  isShippingEnabled: boolean;
  estimatedDeliveryDays: string;
}

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  shippingFee: 300,
  freeShippingThreshold: 5000,
  isFreeShippingEnabled: true,
  isShippingEnabled: true,
  estimatedDeliveryDays: '5-7 business days',
};

/**
 * Calculate the active shipping fee based on discounted subtotal and configuration.
 * @param discountedSubtotal - Order subtotal after subtracting any promo code discount
 * @param config - Current shipping configuration
 * @returns Shipping fee (0 or configured amount)
 */
export function calculateShipping(
  discountedSubtotal: number,
  config: Partial<ShippingConfig> = DEFAULT_SHIPPING_CONFIG
): number {
  const subtotal = Math.max(0, Number(discountedSubtotal) || 0);
  const cfg = { ...DEFAULT_SHIPPING_CONFIG, ...config };

  // If shipping is disabled globally or fee is 0, delivery is completely free
  if (cfg.isShippingEnabled === false || (Number(cfg.shippingFee) || 0) <= 0) {
    return 0;
  }

  // If free shipping threshold is enabled and discounted subtotal meets or exceeds threshold
  if (cfg.isFreeShippingEnabled !== false && subtotal >= (Number(cfg.freeShippingThreshold) || 0)) {
    return 0;
  }

  // Standard configured fee
  return Math.round((Number(cfg.shippingFee) || 0) * 100) / 100;
}

/**
 * Returns dynamic customer-facing badge text (e.g. "Free shipping on orders over Rs. 5,000")
 */
export function getFreeShippingThresholdText(
  config: Partial<ShippingConfig> = DEFAULT_SHIPPING_CONFIG
): string {
  const cfg = { ...DEFAULT_SHIPPING_CONFIG, ...config };

  if (cfg.isShippingEnabled === false || (Number(cfg.shippingFee) || 0) <= 0) {
    return 'Free shipping on all orders';
  }

  if (cfg.isFreeShippingEnabled === false) {
    return `Standard delivery Rs. ${(Number(cfg.shippingFee) || 0).toLocaleString()}`;
  }

  return `Free shipping on orders over Rs. ${(Number(cfg.freeShippingThreshold) || 0).toLocaleString()}`;
}

/**
 * Returns dynamic short badge text for product pages (e.g. "Over Rs 5,000" or "All Orders")
 */
export function getFreeShippingShortText(
  config: Partial<ShippingConfig> = DEFAULT_SHIPPING_CONFIG
): string {
  const cfg = { ...DEFAULT_SHIPPING_CONFIG, ...config };

  if (cfg.isShippingEnabled === false || (Number(cfg.shippingFee) || 0) <= 0) {
    return 'All orders';
  }

  if (cfg.isFreeShippingEnabled === false) {
    return `Rs. ${(Number(cfg.shippingFee) || 0).toLocaleString()}`;
  }

  return `Over Rs ${(Number(cfg.freeShippingThreshold) || 0).toLocaleString()}`;
}

/**
 * Returns the full delivery policy statement for Product Details and Chatbot.
 */
export function getDeliveryPolicyStatement(
  config: Partial<ShippingConfig> = DEFAULT_SHIPPING_CONFIG
): string {
  const cfg = { ...DEFAULT_SHIPPING_CONFIG, ...config };
  const fee = (Number(cfg.shippingFee) || 0).toLocaleString();
  const threshold = (Number(cfg.freeShippingThreshold) || 0).toLocaleString();

  if (cfg.isShippingEnabled === false || (Number(cfg.shippingFee) || 0) <= 0) {
    return 'We offer complimentary FREE delivery on all orders across Pakistan.';
  }

  if (cfg.isFreeShippingEnabled === false) {
    return `A standard delivery fee of Rs. ${fee} applies to all orders across Pakistan.`;
  }

  return `A standard delivery fee of Rs. ${fee} applies to all orders under Rs. ${threshold}. Orders of Rs. ${threshold} and above qualify for FREE delivery.`;
}

/**
 * Dynamically replace hardcoded shipping numbers in messages if the message is shipping-related.
 * Unrelated messages are returned unmodified.
 */
export function interpolateShippingMessage(
  text: string,
  config: Partial<ShippingConfig> = DEFAULT_SHIPPING_CONFIG
): string {
  if (!text || typeof text !== 'string') return text;

  const isShippingRelated = /(free\s*shipping|free\s*delivery|shipping\s*fee|delivery\s*fee|delivery\s*charges|shipping\s*charges)/i.test(text);
  if (!isShippingRelated) {
    return text;
  }

  const cfg = { ...DEFAULT_SHIPPING_CONFIG, ...config };
  const threshold = (Number(cfg.freeShippingThreshold) || 0).toLocaleString();
  const fee = (Number(cfg.shippingFee) || 0).toLocaleString();

  if (cfg.isShippingEnabled === false || (Number(cfg.shippingFee) || 0) <= 0) {
    return '📢 Free shipping on all orders';
  }

  if (cfg.isFreeShippingEnabled === false) {
    return `📢 Standard delivery Rs. ${fee} across Pakistan`;
  }

  // Replace threshold numbers like 5,000 or 5000 in "orders over / above / exceeding"
  let updated = text.replace(/(orders\s+(?:over|above|exceeding|from)\s+)(?:Rs\.?|₨|PKR)?\s*[\d,]+/gi, `$1Rs. ${threshold}`);

  // Replace phrases like "free delivery over Rs 5,000"
  updated = updated.replace(/(free\s+(?:shipping|delivery)\s+(?:over|above|from|on orders over)\s+)(?:Rs\.?|₨|PKR)?\s*[\d,]+/gi, `$1Rs. ${threshold}`);

  return updated;
}
