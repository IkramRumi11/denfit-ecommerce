import { useState, useEffect } from 'react';

// Hook to persist per-product variant selection (localStorage + in-memory)
export function useProductVariant(productId?: string) {
  const key = productId ? `product-variant-${productId}` : null;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    try {
      const v = localStorage.getItem(key);
      if (v) setSelectedVariantId(v);
    } catch (e) {
      // ignore
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    try {
      if (selectedVariantId) localStorage.setItem(key, String(selectedVariantId));
      else localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  }, [key, selectedVariantId]);

  return {
    selectedVariantId,
    setSelectedVariantId
  } as const;
}
