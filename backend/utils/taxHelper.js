export const isTaxEnabled = () => String(process.env.TAX_FEATURE_ENABLED || '').toLowerCase() === 'true';

export const getTaxRate = () => Number(process.env.TAX_RATE) || 0.13;

export const computeTax = (subtotal = 0) => {
  if (!isTaxEnabled()) return 0;
  return Math.round(Number(subtotal || 0) * getTaxRate() * 100) / 100;
};

export const customerTotalFromParts = ({ subtotal = 0, shippingCost = 0 } = {}) => {
  return Math.round((Number(subtotal || 0) + Number(shippingCost || 0)) * 100) / 100;
};

export const enforceOrderTaxPolicy = (order) => {
  if (!order) return order;
  if (!isTaxEnabled()) {
    try {
      const subtotal = Number(order.subtotal || 0);
      const shippingCost = Number(order.shippingCost || 0);
      if (typeof order.taxAmount === 'number' && Number(order.taxAmount) > 0 && typeof order.legacyTax === 'undefined') {
        order.legacyTax = Number(order.taxAmount);
      }
      if (typeof order.total === 'number' && typeof order.legacyTotal === 'undefined') {
        order.legacyTotal = Number(order.total);
      }
      order.taxAmount = 0;
      order.total = customerTotalFromParts({ subtotal, shippingCost });
    } catch (e) {
      // ignore
    }
  }
  return order;
};
