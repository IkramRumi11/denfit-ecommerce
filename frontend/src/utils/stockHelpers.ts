export function getAvailableQuantity(product: any, selectedSize?: string, selectedColor?: string): number {
  if (!product) return 0;

  // Exact variant stock mapping match first
  if (Array.isArray(product.stock) && product.stock.length && selectedSize && selectedColor) {
    const match = product.stock.find((s: any) => {
      if (!s) return false;
      const matchesColor = String(s.colorTempId).toLowerCase().trim() === String(selectedColor).toLowerCase().trim();
      
      // Resolve size ID if stored as ID (e.g. size_39) or value (e.g. 39)
      let displaySize = s.sizeId;
      if (Array.isArray(product.sizes) && product.sizes.length) {
        const found = product.sizes.find((sz: any) => sz.id === s.sizeId || sz.value === s.sizeId);
        if (found) displaySize = found.value || found.id;
      }
      const matchesSize = String(displaySize).toLowerCase().trim() === String(selectedSize).toLowerCase().trim();
      return matchesColor && matchesSize;
    });
    if (match && typeof match.quantity === 'number') return match.quantity;
    return 0;
  }

  // Color-specific sum if only color selected
  if (Array.isArray(product.stock) && product.stock.length && selectedColor) {
    const total = product.stock.reduce((acc: number, s: any) => {
      if (s && String(s.colorTempId).toLowerCase().trim() === String(selectedColor).toLowerCase().trim()) {
        return acc + (Number(s.quantity) || 0);
      }
      return acc;
    }, 0);
    return total;
  }

  // Size-specific sum if only size selected
  if (Array.isArray(product.stock) && product.stock.length && selectedSize) {
    const total = product.stock.reduce((acc: number, s: any) => {
      if (s) {
        let displaySize = s.sizeId;
        if (Array.isArray(product.sizes) && product.sizes.length) {
          const found = product.sizes.find((sz: any) => sz.id === s.sizeId || sz.value === s.sizeId);
          if (found) displaySize = found.value || found.id;
        }
        if (String(displaySize).toLowerCase().trim() === String(selectedSize).toLowerCase().trim()) {
          return acc + (Number(s.quantity) || 0);
        }
      }
      return acc;
    }, 0);
    return total;
  }

  if (typeof product.availableQuantity === 'number') return product.availableQuantity;

  // Preferred: selectedVariant inventory
  if (product.selectedVariant && typeof product.selectedVariant.inventory === 'number') return product.selectedVariant.inventory;

  // stock mapping
  if (Array.isArray(product.stock) && product.stock.length) {
    return product.stock.reduce((acc: number, s: any) => acc + (Number((s && s.quantity) || 0)), 0);
  }

  // sizes
  if (Array.isArray(product.sizes) && product.sizes.length) {
    return product.sizes.reduce((acc: number, s: any) => acc + (Number((s && s.quantity) || 0)), 0);
  }

  // variants
  if (Array.isArray(product.variants) && product.variants.length) {
    return product.variants.reduce((acc: number, v: any) => acc + (Number((v && v.inventory) || 0)), 0);
  }

  if (typeof product.inventory === 'number') return product.inventory;

  return 0;
}

export function isOutOfStock(product: any, selectedSize?: string, selectedColor?: string): boolean {
  return getAvailableQuantity(product, selectedSize, selectedColor) <= 0;
}

export function isLowStock(product: any, selectedSize?: string, selectedColor?: string): boolean {
  if (!product) return false;
  if (typeof product.isLowStock === 'boolean') return product.isLowStock;
  // Fallback to runtime env threshold if provided (Vite env variable name VITE_LOW_STOCK_THRESHOLD)
  const viteRaw = (import.meta && (import.meta as any).env && (import.meta as any).env.VITE_LOW_STOCK_THRESHOLD);
  const nodeRaw = (typeof process !== 'undefined' && (process as any).env && (process as any).env.VITE_LOW_STOCK_THRESHOLD) ? (process as any).env.VITE_LOW_STOCK_THRESHOLD : undefined;
  const raw = viteRaw || nodeRaw;
  const threshold = raw ? Number(raw) : 20;
  if (Number.isNaN(threshold)) return false;
  const qty = getAvailableQuantity(product, selectedSize, selectedColor);
  return qty > 0 && qty <= threshold;
}

export default { getAvailableQuantity, isOutOfStock, isLowStock };
