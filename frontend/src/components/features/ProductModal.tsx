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

  const hasSizes = product.sizes && product.sizes.length > 0;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-black"
            aria-label="Close product details"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 flex items-center justify-center">
              <FallbackImage
                src={primaryImage(product)}
                alt={product.name}
                className="object-cover max-h-[500px] w-full"
                loading="lazy"
              />
            </div>

            <div className="p-6 flex flex-col">
              <Dialog.Title className="text-2xl font-bold text-gray-900">
                {product.name}
              </Dialog.Title>
              <p className="mt-2 text-gray-500 capitalize">{product.category}</p>

              <div className="mt-4">
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(product.price)}
                </p>
              </div>

              {hasSizes ? (
                <div className="mt-6">
                  <p className="block text-sm font-medium text-gray-700 mb-2">
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
                        className={`px-4 py-2 border rounded-md text-sm transition ${
                          selectedSize === size
                            ? "border-black bg-black text-white"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                        aria-pressed={selectedSize === size}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-6">
                  <p className="text-sm text-gray-500">One size fits all</p>
                </div>
              )}

              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize && hasSizes}
                  className={`flex-1 py-3 rounded-md font-medium transition ${
                    !selectedSize && hasSizes
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  Add to Cart
                </button>

                {onToggleWishlist && (
                  <button
                    onClick={() => onToggleWishlist(product)}
                    className={`px-4 py-3 border rounded-md flex items-center justify-center transition ${
                      isInWishlist
                        ? "text-red-500 border-red-500"
                        : "text-gray-600 hover:text-black border-gray-300"
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
