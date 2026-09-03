// src/components/features/ProductModal.tsx
import { Dialog } from "@headlessui/react";
import { X, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "../../types";
import FallbackImage from "../ui/FallbackImage";
import { primaryImage } from '../../utils/productHelpers';
import { formatCurrency } from "../../utils/formatCurrency";

type ProductModalProps = {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, selectedSize: string) => void;
  onToggleWishlist?: (product: Product) => void;
  isInWishlist?: boolean;
};

export default function ProductModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false,
}: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      // Do not auto-select a size; require explicit user selection
      setSelectedSize(null);
      setError(null);
    } else {
      setSelectedSize(null);
      setError(null);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      setError("Please select a size");
      return;
    }
    setError(null);
    onAddToCart(product, selectedSize);
  };

  const rawOriginalPrice = (product as any)?.originalPrice || (product as any)?.compareAtPrice;
  const originalPriceNumber = typeof rawOriginalPrice === 'number' && Number.isFinite(rawOriginalPrice) 
    ? rawOriginalPrice 
    : (rawOriginalPrice ? Number(rawOriginalPrice) : undefined);
  const currentPrice = typeof product.price === 'number' ? product.price : Number(product.price || 0);
  const hasSaleDiscount = Boolean(originalPriceNumber && originalPriceNumber > currentPrice);
  const discountPercent = hasSaleDiscount && originalPriceNumber
    ? Math.round(((originalPriceNumber - currentPrice) / originalPriceNumber) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl mx-auto overflow-hidden border border-neutral-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors z-10"
            aria-label="Close product details"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 flex items-center justify-center overflow-hidden aspect-square">
              <FallbackImage
                src={primaryImage(product)}
                alt={product.name}
                className="object-cover h-full w-full"
                loading="lazy"
              />
            </div>

            <div className="p-6 md:p-8 flex flex-col justify-between">
              <div>
                <p className="text-[11px] tracking-[0.24em] uppercase text-neutral-400 mb-1">
                  {product.category ? `Denfit • ${product.category}` : 'Denfit Maison'}
                </p>
                <Dialog.Title className="text-xl md:text-2xl font-light text-neutral-900 tracking-[0.12em] uppercase leading-tight mb-3">
                  {product.name}
                </Dialog.Title>

                {/* Pricing with Sale Strikethrough & Free Shipping Text */}
                <div className="py-3 px-4 rounded-2xl bg-neutral-50 border border-neutral-100 my-3">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className={`text-2xl md:text-3xl font-light tracking-wide ${
                      hasSaleDiscount ? 'text-red-600 font-semibold' : 'text-neutral-900 font-medium'
                    }`}>
                      Rs. {currentPrice.toLocaleString()}
                    </span>
                    {hasSaleDiscount && originalPriceNumber && (
                      <span className="text-sm md:text-base text-neutral-400 line-through decoration-neutral-400 font-normal">
                        Rs. {originalPriceNumber.toLocaleString()}
                      </span>
                    )}
                    {hasSaleDiscount && discountPercent > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-600 text-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-sm">
                        -{discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 font-normal">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Free
                    </span>
                    <span>shipping over ₨5,000 • 14-day returns</span>
                  </div>
                </div>

                {product.description && (
                  <p className="text-neutral-600 font-light text-xs md:text-sm leading-relaxed my-3">
                    {product.description}
                  </p>
                )}

                {hasSizes ? (
                  <div className="mt-4">
                    <p className="block text-xs uppercase tracking-[0.2em] font-medium text-neutral-700 mb-2">
                      Select Size
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setSelectedSize(size);
                            setError(null);
                          }}
                          className={`px-4 py-2 border rounded-xl text-xs font-medium uppercase tracking-wider transition select-none ${
                            selectedSize === size
                              ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                              : "border-neutral-200 text-neutral-800 hover:border-neutral-900 bg-white"
                          }`}
                          aria-pressed={selectedSize === size}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {error && (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-xs text-neutral-500">One size fits all</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize && hasSizes}
                  className={`flex-1 py-3.5 px-6 rounded-full font-medium text-xs uppercase tracking-[0.2em] transition-all shadow-sm ${
                    !selectedSize && hasSizes
                      ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                      : "bg-black text-white hover:bg-neutral-800 active:scale-[0.99]"
                  }`}
                >
                  Add to Cart
                </button>

                {onToggleWishlist && (
                  <button
                    onClick={() => onToggleWishlist(product)}
                    className={`p-3.5 border rounded-full flex items-center justify-center transition ${
                      isInWishlist
                        ? "text-red-600 border-red-500 bg-red-50"
                        : "text-neutral-400 hover:text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                    aria-label={
                      isInWishlist ? "Remove from wishlist" : "Add to wishlist"
                    }
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        isInWishlist ? "fill-current" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
