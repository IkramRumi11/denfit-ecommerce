import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  ShieldCheck,
  ShoppingBag,
  Tag,
  ArrowRight,
  RefreshCw,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { productsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { productId } from '../utils/productHelpers';
import { usePageBanner } from '../hooks/usePageBanner';

export const PrivateSale: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [eligibility, setEligibility] = useState<{
    loading: boolean;
    eligible: boolean;
    reason?: string;
    requiresLogin?: boolean;
    requiresVerification?: boolean;
    requiresOrder?: boolean;
    orderCount?: number;
  }>({
    loading: true,
    eligible: false,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Filters & sorting
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'newest'>('featured');
  const [searchQuery, setSearchQuery] = useState('');

  // Reusable Category Hero Banner via usePageBanner
  const { banner: privateSaleBanner } = usePageBanner('private_sale_hero');
  const heroImageUrl =
    privateSaleBanner?.imageUrl ||
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1800&auto=format&fit=crop';
  const heroTitle = privateSaleBanner?.title || 'PRIVATE SALE';
  const heroSubtitle =
    privateSaleBanner?.subtitle ||
    'Curated archival garments, bespoke fragrance reserves, and private tier pricing accessible only to verified patrons.';

  // Check eligibility on mount or when user auth changes
  useEffect(() => {
    let mounted = true;

    const verifyAccess = async () => {
      setEligibility((prev) => ({ ...prev, loading: true }));
      try {
        const res = await productsAPI.checkPrivateSaleEligibility();
        if (!mounted) return;

        if (res?.data) {
          setEligibility({
            loading: false,
            eligible: !!res.data.eligible,
            reason: res.data.reason,
            requiresLogin: !!res.data.requiresLogin,
            requiresVerification: !!res.data.requiresVerification,
            requiresOrder: !!res.data.requiresOrder,
            orderCount: res.data.orderCount,
          });

          if (res.data.eligible) {
            loadProducts();
          }
        } else {
          setEligibility({
            loading: false,
            eligible: false,
            requiresLogin: !isAuthenticated,
            reason: res?.message || 'Access verification failed',
          });
        }
      } catch (err: any) {
        if (!mounted) return;
        setEligibility({
          loading: false,
          eligible: false,
          requiresLogin: !isAuthenticated,
          reason: err?.message || 'Please sign in to check your eligibility.',
        });
      }
    };

    verifyAccess();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user]);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await productsAPI.getPrivateSale({ limit: 100 });
      if (res?.data?.products) {
        setProducts(res.data.products);
      } else if (Array.isArray((res as any)?.products)) {
        setProducts((res as any).products);
      }
    } catch (e) {
      console.error('Failed to load Private Sale products:', e);
    } finally {
      setProductsLoading(false);
    }
  };

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== 'all') {
      list = list.filter(
        (p) =>
          (p.category || '').toLowerCase() === selectedCategory.toLowerCase() ||
          (p.gender || '').toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list;
  }, [products, selectedCategory, searchQuery, sortBy]);

  const categories = [
    { id: 'all', label: 'All Archive' },
    { id: 'men', label: 'Men' },
    { id: 'women', label: 'Women' },
    { id: 'kids', label: 'Kids' },
    { id: 'fragrances', label: 'Fragrances' },
    { id: 'accessories', label: 'Accessories' },
  ];

  return (
    <div className="w-full bg-white text-gray-900 min-h-screen">
      {/* ─── 1. Private Sale Hero Banner (Reusing Established DENFiT Hero System) ─── */}
      <section className="relative w-full h-[360px] sm:h-[420px] md:h-[480px] lg:h-[500px] overflow-hidden mb-4 md:mb-6">
        <img
          src={heroImageUrl}
          alt={heroTitle}
          className="w-full h-full object-cover"
        />
        {/* Cinematic gradient overlay matching DENFiT category hero styling */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/40" />

        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl text-white">
              {/* Denfit Maison Top Mini-Bar */}
              <div className="flex items-center gap-3 text-[10px] md:text-[11px] tracking-[0.24em] uppercase text-neutral-300 mb-3 sm:mb-4">
                <span className="h-[1px] w-6 bg-neutral-400" />
                <span>DENFiT Maison • Private Client Reserve</span>
              </div>

              {/* VIP Status Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-[10px] md:text-[11px] uppercase tracking-[0.24em] text-neutral-100 mb-3 sm:mb-4 shadow-sm">
                <Lock className="w-3 h-3 text-neutral-200" />
                <span>Private Client Access</span>
              </div>

              {/* Main Editorial Heading */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-[0.20em] uppercase text-white leading-[1.1] mb-3">
                {heroTitle}
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-neutral-200 font-light leading-relaxed tracking-wide mb-5 max-w-xl">
                {heroSubtitle}
              </p>

              {/* VIP Feature Badges */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-neutral-300 border-t border-white/15 pt-3.5 sm:pt-4">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-neutral-200" />
                  <span>Verified Patron Privilege</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-neutral-200" />
                  <span>Archival Tier Allocation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-neutral-200" />
                  <span>White-Glove Priority Dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. White Product / Catalog Section (Same as Men, Women, Kids, Sale) ─── */}
      <div className="bg-white text-gray-900 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="mb-4 sm:mb-6">
            <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Private Sale' }]} />
          </div>

          {/* State 1: Verification / Loading */}
          {eligibility.loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin mx-auto mb-3" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.20em] text-gray-900">
                Authenticating Client Privilege...
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Checking account verification and purchase history
              </p>
            </div>
          ) : !eligibility.eligible ? (
            /* State 2: Gated Access Screen */
            <div className="py-8 max-w-lg mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-gray-200 bg-gray-50/80 p-8 sm:p-10 text-center shadow-sm"
              >
                <div className="w-14 h-14 rounded-full border border-gray-200 bg-white flex items-center justify-center mx-auto mb-5 text-gray-900 shadow-sm">
                  {eligibility.requiresLogin ? (
                    <Lock className="w-6 h-6 stroke-[1.5]" />
                  ) : eligibility.requiresVerification ? (
                    <Mail className="w-6 h-6 stroke-[1.5]" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                  )}
                </div>

                {eligibility.requiresLogin ? (
                  <>
                    <span className="inline-block text-[10px] md:text-[11px] tracking-[0.24em] uppercase text-gray-500 font-medium mb-2">
                      Authentication Required
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-light tracking-[0.16em] uppercase text-gray-900 mb-3">
                      Private Client Access
                    </h2>
                    <p className="text-gray-600 text-xs sm:text-sm mb-6 max-w-md mx-auto leading-relaxed">
                      DENFiT Private Sale allocations are reserved strictly for registered members. Sign in to your account to unveil private archive selections.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link
                        to="/auth?redirect=/private-sale"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-black text-white px-7 py-2.5 text-xs uppercase tracking-[0.20em] font-medium hover:bg-gray-800 transition shadow-sm"
                      >
                        <span>Sign In to Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to="/sale"
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:text-black hover:border-black px-7 py-2.5 text-xs uppercase tracking-[0.20em] transition"
                      >
                        Browse Seasonal Sale
                      </Link>
                    </div>
                  </>
                ) : eligibility.requiresVerification ? (
                  <>
                    <span className="inline-block text-[10px] md:text-[11px] tracking-[0.24em] uppercase text-gray-500 font-medium mb-2">
                      Verification Required
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-light tracking-[0.16em] uppercase text-gray-900 mb-3">
                      Confirm Email Address
                    </h2>
                    <p className="text-gray-600 text-xs sm:text-sm mb-6 max-w-md mx-auto leading-relaxed">
                      Your account ({user?.email}) requires email confirmation before private archive pricing can be unlocked.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link
                        to="/profile"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-black text-white px-7 py-2.5 text-xs uppercase tracking-[0.20em] font-medium hover:bg-gray-800 transition shadow-sm"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Verify in Profile</span>
                      </Link>
                      <Link
                        to="/shop"
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:text-black hover:border-black px-7 py-2.5 text-xs uppercase tracking-[0.20em] transition"
                      >
                        Continue Shopping
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="inline-block text-[10px] md:text-[11px] tracking-[0.24em] uppercase text-gray-500 font-medium mb-2">
                      Patron Requirement
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-light tracking-[0.16em] uppercase text-gray-900 mb-3">
                      Exclusive Patron Reserve
                    </h2>
                    <p className="text-gray-600 text-xs sm:text-sm mb-6 max-w-md mx-auto leading-relaxed">
                      Private Sale access activates automatically following your first DENFiT order. Explore our catalog to place your initial qualifying order.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link
                        to="/shop"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-black text-white px-7 py-2.5 text-xs uppercase tracking-[0.20em] font-medium hover:bg-gray-800 transition shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Explore Collection</span>
                      </Link>
                      <Link
                        to="/sale"
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:text-black hover:border-black px-7 py-2.5 text-xs uppercase tracking-[0.20em] transition"
                      >
                        Explore Seasonal Sale
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          ) : (
            /* State 3: Eligible VIP Customer View */
            <div className="space-y-5 sm:space-y-6">
              {/* Filter & Sort Bar (Clean, compact, aligned with Category Pages) */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 sm:p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.14em] transition-all whitespace-nowrap ${
                        selectedCategory === cat.id
                          ? 'bg-black text-white shadow-sm'
                          : 'border border-gray-200 bg-white text-gray-600 hover:text-black hover:border-gray-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search & Compact Sort Controls */}
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  <div className="relative flex-1 sm:flex-initial">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search archive..."
                      className="w-full sm:w-36 md:w-44 px-3 py-1.5 text-xs rounded-full border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
                    />
                  </div>

                  {/* Compact Featured / Sort Dropdown */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-gray-500 uppercase tracking-wider hidden sm:inline font-medium">Sort:</span>
                    <div className="relative inline-flex items-center">
                      <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="appearance-none text-[11px] sm:text-xs font-medium pl-3 pr-7 py-1.5 rounded-full border border-gray-200 bg-white text-gray-800 hover:border-gray-400 focus:outline-none focus:border-black cursor-pointer shadow-sm transition-colors"
                      >
                        <option value="featured">Featured</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="newest">Newest First</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 pointer-events-none stroke-[2]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Grid / Loading / Empty States */}
              {productsLoading ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin mx-auto mb-3" />
                  <p className="text-xs uppercase tracking-[0.20em] text-gray-500">Loading private archive pieces...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-10 sm:p-14 text-center max-w-lg mx-auto">
                  <div className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center mx-auto mb-3.5 text-gray-400 shadow-sm">
                    <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-light tracking-[0.16em] uppercase text-gray-900 mb-2">
                    No Archive Pieces Found
                  </h3>
                  <p className="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto mb-5 font-light leading-relaxed">
                    {searchQuery || selectedCategory !== 'all'
                      ? 'No products matched your selected archive criteria.'
                      : 'The Private Sale vault is currently being refreshed with new capsule pieces.'}
                  </p>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white text-gray-800 px-5 py-2 text-xs uppercase tracking-[0.18em] font-medium hover:border-black hover:text-black transition shadow-sm"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3.5 sm:mb-4 px-0.5 text-xs text-gray-500 font-medium">
                    <div>
                      Presenting <span className="text-gray-900 font-semibold">{filteredProducts.length}</span> Exclusive Allocation{filteredProducts.length > 1 ? 's' : ''}
                    </div>
                    <div className="uppercase tracking-wider text-[11px] text-gray-400 hidden sm:block">
                      Limited Run • Hand Finished
                    </div>
                  </div>
                  {/* Standard DENFiT Responsive Grid: 2 mobile, 3 tablet, 4 desktop, 5 wide-desktop */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
                    {filteredProducts.map((product) => (
                      <ProductCard key={productId(product)} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivateSale;
