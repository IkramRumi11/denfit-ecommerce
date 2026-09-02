/**
 * CategoryPage — Unified, SEO-friendly category page for DENFiT.
 *
 * Renders a filtered product listing for any gender+subcategory combination.
 * Uses FilterEngine for fully dynamic, database-driven filters.
 *
 * Routes: /men/:subcategory, /women/:subcategory, /kids/:subcategory,
 *         /sale/:type, /accessories/:subcategory
 */
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid, List, Search, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { FilterEngine } from '../components/FilterEngine';
import { ProductCard } from '../components/ProductCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { primaryImage } from '../utils/productHelpers';
import { isOutOfStock } from '../utils/stockHelpers';

// Utility: Convert slug to display title
const slugToTitle = (slug: string): string =>
  slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Sort options matching the backend
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'alphabetical', label: 'A – Z' },
  { value: 'discount', label: 'Biggest Discount' },
];

interface CategoryPageProps {
  /** Override gender from route (e.g. for /sale, /accessories) */
  genderOverride?: string;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ genderOverride }) => {
  const { subcategory } = useParams<{ subcategory?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive gender from the current pathname or override
  const gender = genderOverride || (() => {
    const path = window.location.pathname.split('/')[1];
    if (['men', 'women', 'kids', 'sale', 'accessories'].includes(path)) return path;
    return '';
  })();

  const categorySlug = subcategory || '';

  // State
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileSort, setShowMobileSort] = useState(false);
  const [quickAddProduct, setQuickAddProduct] = useState<any | null>(null);
  const scrollYRef = useRef(0);

  const { addItem } = useCart();
  const { showToast } = useToast();

  const currentSort = searchParams.get('sort') || 'newest';

  // Quick-add handler
  const openQuickAdd = (product: any) => {
    if (!product || isOutOfStock(product)) {
      showToast('Product is out of stock', 'error');
      return;
    }
    setQuickAddProduct(product);
  };

  const closeQuickAdd = () => setQuickAddProduct(null);

  const performAddToCart = (product: any, size: string, color?: string) => {
    try {
      const variantSnapshot = (() => {
        if (!product?.variants) return undefined;
        const find = (x: any) =>
          String(x._id || x.id) === String(color) ||
          String(x.hex || x.normalizedHex || x.value || '').toLowerCase() === String(color || '').toLowerCase() ||
          String(x.name || '').toLowerCase() === String(color || '').toLowerCase();
        const v = product.variants.find((x: any) => (color ? find(x) : false));
        if (v) return {
          id: String(v._id || v.id),
          name: v.name,
          hex: v.hex || v.normalizedHex || v.value,
          image: Array.isArray(v.images) && v.images[0]
            ? (typeof v.images[0] === 'string' ? v.images[0] : v.images[0].url)
            : undefined,
        };
        return undefined;
      })();

      const colorNormalized = variantSnapshot
        ? (variantSnapshot.hex || variantSnapshot.name)
        : (color || undefined);

      const availableStock = getAvailableStockForItem(product, {
        size,
        color: colorNormalized,
        variantId: variantSnapshot?.id
      });

      const res = addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: primaryImage({ ...product, selectedVariantId: variantSnapshot?.id } as any),
        size,
        color: colorNormalized,
        colorName: variantSnapshot?.name ?? undefined,
        variantId: variantSnapshot?.id,
        variantName: variantSnapshot?.name,
        variantHex: variantSnapshot?.hex,
        variantImage: variantSnapshot?.image,
        quantity: 1,
        maxStock: availableStock
      }, availableStock);

      if (!res.success) {
        if (res.reason === 'MAX_REACHED') {
          showToast(`You already have all ${availableStock} available units in your cart`, 'warning');
        } else {
          showToast('Product is out of stock', 'error');
        }
        return;
      }

      showToast(`${product.name} added to the cart`, 'success');
      closeQuickAdd();
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Failed to add to cart', 'error');
    }
  };

  // Sort handler
  const handleSort = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sort', value);
      next.delete('page');
      return next;
    }, { replace: true });
    setShowMobileSort(false);
  };

  // Page handler
  const handlePage = (page: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(page));
      return next;
    }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Breadcrumb segments
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    ...(gender ? [{ label: slugToTitle(gender), to: `/${gender}` }] : []),
    ...(categorySlug ? [{ label: slugToTitle(categorySlug), to: `/${gender}/${categorySlug}` }] : []),
  ];

  // Page title for SEO
  const pageTitle = categorySlug
    ? `${slugToTitle(categorySlug)} — ${slugToTitle(gender || 'Shop')}`
    : `${slugToTitle(gender || 'Shop')} Collection`;

  useEffect(() => {
    document.title = `${pageTitle} | DENFiT`;
  }, [pageTitle]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ─── Breadcrumbs ─── */}
      <nav className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 pb-2" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs text-gray-500">
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.to} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-gray-400" />}
              {i < breadcrumbs.length - 1 ? (
                <Link to={crumb.to} className="hover:text-gray-900 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* ─── Page Header ─── */}
      <header className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-gray-900">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {loading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* ─── Desktop Controls ─── */}
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="hidden sm:flex items-center gap-2">
              <label htmlFor="sort-select" className="text-xs text-gray-500 uppercase tracking-wider">
                Sort
              </label>
              <select
                id="sort-select"
                value={currentSort}
                onChange={(e) => handleSort(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Grid view"
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="List view"
              >
                <List size={16} />
              </button>
            </div>

            {/* Mobile Sort Button */}
            <button
              onClick={() => setShowMobileSort(!showMobileSort)}
              className="sm:hidden flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
            >
              Sort
            </button>
          </div>
        </div>

        {/* Mobile Sort Menu */}
        <AnimatePresence>
          {showMobileSort && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden overflow-hidden mt-3"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-2 grid grid-cols-2 gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSort(opt.value)}
                    className={`px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      currentSort === opt.value
                        ? 'bg-gray-900 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── Main Content: Sidebar + Grid ─── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-16">
        <div className="flex gap-8">
          {/* FilterEngine renders: desktop sidebar, mobile trigger, mobile drawer, active filter chips */}
          <FilterEngine
            gender={gender}
            categorySlug={categorySlug}
            onProductsChange={setProducts}
            onLoadingChange={setLoading}
            onTotalChange={setTotal}
            onPaginationChange={setPagination}
            pageSize={24}
          />

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="py-20 text-center">
                  <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                  <p className="mt-4 text-sm text-gray-500 tracking-wide">Loading products...</p>
                </div>
              ) : products.length > 0 ? (
                <motion.div
                  layout
                  className={`grid ${
                    viewMode === 'grid'
                      ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5'
                      : 'grid-cols-1 gap-3'
                  }`}
                >
                  {products.map((product, idx) => (
                    <motion.div
                      key={product.id || product._id}
                      layout="position"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                    >
                      {viewMode === 'grid' ? (
                        <ProductCard
                          product={product}
                          onAddToCart={() => openQuickAdd(product)}
                        />
                      ) : (
                        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-400 transition-all group">
                          <div className="w-32 sm:w-44 flex-shrink-0">
                            <img
                              src={primaryImage(product)}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
                            <div>
                              <h3 className="text-base font-semibold text-gray-900 truncate">{product.name}</h3>
                              {product.brand && (
                                <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
                              )}
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                              <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-lg font-bold text-gray-900">
                                  Rs {(product.price || 0).toLocaleString()}
                                </span>
                                {product.originalPrice && product.originalPrice > product.price && (
                                  <span className="text-sm text-gray-400 line-through">
                                    Rs {product.originalPrice.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => openQuickAdd(product)}
                              className="mt-3 self-start px-5 py-2 bg-gray-900 text-white text-xs font-medium uppercase tracking-wider rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="py-20 text-center">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-xl font-medium text-gray-900 mb-2">No products found</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Try adjusting your filters or browse a different category.
                  </p>
                  <Link
                    to={`/${gender || 'shop'}`}
                    className="inline-block px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    Browse All {slugToTitle(gender || 'Products')}
                  </Link>
                </div>
              )}
            </AnimatePresence>

            {/* ─── Pagination ─── */}
            {!loading && pagination.pages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                <button
                  onClick={() => handlePage(pagination.current - 1)}
                  disabled={pagination.current <= 1}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                  let page: number;
                  if (pagination.pages <= 7) {
                    page = i + 1;
                  } else if (pagination.current <= 4) {
                    page = i + 1;
                  } else if (pagination.current >= pagination.pages - 3) {
                    page = pagination.pages - 6 + i;
                  } else {
                    page = pagination.current - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => handlePage(page)}
                      className={`w-10 h-10 text-sm rounded-lg transition-colors ${
                        page === pagination.current
                          ? 'bg-gray-900 text-white font-medium'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePage(pagination.current + 1)}
                  disabled={pagination.current >= pagination.pages}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      </main>

      {/* QuickView Modal */}
      <QuickViewModal
        product={quickAddProduct}
        isOpen={!!quickAddProduct}
        onClose={closeQuickAdd}
        onAddToCart={(size: string, color?: string) => {
          if (quickAddProduct) performAddToCart(quickAddProduct, size, color);
        }}
      />
    </div>
  );
};

export default CategoryPage;
