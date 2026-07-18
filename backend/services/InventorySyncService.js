// backend/services/InventorySyncService.js
import Product from '../models/Product.js';

export function calculateInventory(product) {
  if (!product) return 0;
  const stock = Array.isArray(product.stock) ? product.stock : [];
  
  if (stock.length > 0) {
    return stock.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
  }
  
  // Fallback to sizes if present and numeric
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    const anyNumeric = product.sizes.some(s => s && (s.quantity !== null && s.quantity !== undefined) && !Number.isNaN(Number(s.quantity)));
    if (anyNumeric) {
      return product.sizes.reduce((sum, s) => sum + (Number(s?.quantity) || 0), 0);
    }
  }

  // Fallback to variants if present and numeric
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const anyVariantNumeric = product.variants.some(v => v && (v.inventory !== null && v.inventory !== undefined) && !Number.isNaN(Number(v.inventory)));
    if (anyVariantNumeric) {
      return product.variants.reduce((sum, v) => sum + (Number(v?.inventory) || 0), 0);
    }
  }

  // Fallback to existing overall inventory
  return typeof product.inventory === 'number' && !Number.isNaN(product.inventory) ? product.inventory : 0;
}

export function calculateSizeQuantities(product) {
  if (!product || !Array.isArray(product.sizes)) return;
  const stock = Array.isArray(product.stock) ? product.stock : [];
  
  if (stock.length > 0) {
    product.sizes.forEach((sz) => {
      if (!sz) return;
      const sizeStock = stock.filter((st) => st && String(st.sizeId) === String(sz.id || sz._id));
      const sizeQty = sizeStock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      sz.quantity = sizeQty;
      sz.inStock = sizeQty > 0;
    });
  } else {
    // If no stock array, just set inStock based on size quantity
    product.sizes.forEach((sz) => {
      if (sz) {
        sz.inStock = sz.quantity !== null && Number(sz.quantity) > 0;
      }
    });
  }
}

export function calculateVariantInventory(product) {
  if (!product || !Array.isArray(product.variants)) return;
  const stock = Array.isArray(product.stock) ? product.stock : [];
  
  if (stock.length > 0) {
    product.variants.forEach((v) => {
      if (!v) return;
      const variantStock = stock.filter((st) => {
        if (!st) return false;
        const colorId = String(st.colorTempId || '').toLowerCase().trim();
        return (
          colorId === String(v.name || '').toLowerCase().trim() ||
          colorId === String(v.hex || '').toLowerCase().trim() ||
          colorId === String(v._id || '').toLowerCase().trim() ||
          colorId === String(v.tempId || '').toLowerCase().trim()
        );
      });
      v.inventory = variantStock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    });
  }
}

export function syncProduct(product) {
  if (!product) return;
  
  const USE_STOCK_AS_SOURCE_OF_TRUTH = String(process.env.USE_STOCK_AS_SOURCE_OF_TRUTH || '').toLowerCase() === 'true';
  
  if (USE_STOCK_AS_SOURCE_OF_TRUTH) {
    product.inventory = calculateInventory(product);
    calculateSizeQuantities(product);
    calculateVariantInventory(product);
  }
  
  const currentInventory = Number(product.inventory) || 0;
  product.inStock = currentInventory > 0;
  if (product.availability === 'in-stock' || product.availability === 'out-of-stock') {
    product.availability = currentInventory > 0 ? 'in-stock' : 'out-of-stock';
  }
}

export default {
  calculateInventory,
  calculateSizeQuantities,
  calculateVariantInventory,
  syncProduct
};
