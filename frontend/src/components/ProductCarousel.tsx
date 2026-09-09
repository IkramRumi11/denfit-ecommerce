import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { Product } from '../types';
import { useAutoScrollCarousel } from '../hooks/useAutoScrollCarousel';
import { productUrl } from '../utils/productHelpers';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  maxItems?: number;
  viewAllLink?: string;
  viewAllText?: string;
  autoPlay?: boolean;
  interval?: number;
  variant?: 'default' | 'compact';
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  title,
  subtitle,
  products = [],
  maxItems = 10,
  viewAllLink,
  viewAllText = 'View all',
  autoPlay = false,
  interval = 4000,
  variant = 'default',
}) => {
  const displayProducts = (products || []).slice(0, maxItems);
  const isCompact = variant === 'compact';

  const {
    ref,
    scrollNext,
    scrollPrev,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useAutoScrollCarousel({ autoPlay, interval });

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [displayProducts]);

  if (!displayProducts.length) {
    return null;
  }

  return (
    <section className={`relative ${isCompact ? 'py-6 sm:py-8' : 'py-8 sm:py-12'}`}>
      {/* Header */}
      <div className="flex items-end justify-between mb-4 sm:mb-6 px-1">
        <div>
          <h2 className={`${isCompact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold tracking-tight text-gray-900`}>{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors mr-2"
            >
              <span>{viewAllText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {/* Desktop Arrow Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={scrollPrev}
              disabled={!canScrollLeft}
              aria-label="Previous items"
              className="p-1.5 sm:p-2 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={scrollNext}
              disabled={!canScrollRight}
              aria-label="Next items"
              className="p-1.5 sm:p-2 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel Track */}
      <div
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex ${isCompact ? 'gap-3 sm:gap-4' : 'gap-4 sm:gap-6'} overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-4 pt-1 px-1 -mx-1`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {displayProducts.map((product) => {
          const key = product._id || product.id || String(Math.random());
          if (isCompact) {
            const pid = String(product.id || product._id || '');
            const pImage = (product as any).image || (product.images && product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url) : '');
            return (
              <div
                key={key}
                data-carousel-item
                className="w-[140px] xs:w-[150px] sm:w-[160px] md:w-[170px] flex-shrink-0 snap-start"
              >
                <Link
                  to={productUrl(product)}
                  className="group border border-gray-100 rounded-lg overflow-hidden p-2 flex flex-col items-start hover:shadow-lg transition-all bg-white w-full"
                >
                  <div className="w-full h-28 sm:h-32 bg-gray-50 overflow-hidden mb-2 rounded-md relative">
                    <img
                      src={String(pImage)}
                      alt={String(product.name || '')}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div className="text-xs sm:text-sm font-medium truncate w-full text-gray-900 group-hover:text-blue-600 transition-colors">
                    {String(product.name ?? '')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Rs. {typeof product.price === 'number' ? product.price.toLocaleString() : String(product.price ?? '')}
                  </div>
                </Link>
              </div>
            );
          }

          return (
            <div
              key={key}
              data-carousel-item
              className="w-[240px] xs:w-[260px] sm:w-[280px] md:w-[300px] flex-shrink-0 snap-start"
            >
              <ProductCard product={product} />
            </div>
          );
        })}
      </div>

      {/* Mobile view all link */}
      {viewAllLink && (
        <div className="sm:hidden mt-4 text-center">
          <Link
            to={viewAllLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-900 hover:underline"
          >
            <span>{viewAllText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
};

export default ProductCarousel;
