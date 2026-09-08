import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { Product } from '../types';
import { useAutoScrollCarousel } from '../hooks/useAutoScrollCarousel';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  maxItems?: number;
  viewAllLink?: string;
  viewAllText?: string;
  autoPlay?: boolean;
  interval?: number;
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
}) => {
  const displayProducts = (products || []).slice(0, maxItems);

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
    <section className="relative py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{title}</h2>
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
              className="p-2 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollNext}
              disabled={!canScrollRight}
              aria-label="Next items"
              className="p-2 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
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
        className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-4 pt-1 px-1 -mx-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {displayProducts.map((product) => {
          const key = product._id || product.id || String(Math.random());
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
