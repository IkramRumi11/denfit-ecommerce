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
  SlidersHorizontal,
  Mail,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { productsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';

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
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black text-white selection:bg-white selection:text-black overflow-x-hidden">
      {/* Editorial Luxury Header Banner */}
      <section className="relative overflow-hidden pt-12 md:pt-16 pb-14 md:pb-20 border-b border-white/10">
        {/* Background Ambient Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
          {/* Denfit Maison Top Mini-Bar */}
          <div className="flex items-center justify-between text-[11px] tracking-[0.24em] uppercase text-neutral-400 mb-8 sm:mb-12">
            <span className="flex items-center gap-2">
              <span className="h-[1px] w-8 bg-neutral-600" />
              DENFiT Maison
            </span>
            <span className="hidden sm:inline-flex items-center gap-2">
              <span className="h-[1px] w-8 bg-neutral-600" />
              Private Client Reserve • Edition 2026
            </span>
          </div>

          <div className="text-center max-w-3xl mx-auto">
            {/* VIP Status Pill Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-[10px] md:text-[11px] uppercase tracking-[0.26em] text-neutral-200 mb-6 shadow-sm">
              <Lock className="w-3 h-3 text-neutral-300" />
              <span>Private Client Access</span>
            </div>

            {/* Main Editorial Heading */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-[0.20em] uppercase text-white leading-[1.1] mb-5">
              Private Sale
            </h1>

            <p className="max-w-xl mx-auto text-sm md:text-base text-neutral-300 font-light leading-relaxed tracking-wide">
              Curated archival garments, bespoke fragrance reserves, and private tier pricing accessible only to verified patrons.
            </p>

            {/* Replaced Feature Badges: No AI icons, No 'Backend Gated Access', No 'Full Return & Warranty' */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[11px] uppercase tracking-[0.20em] text-neutral-400 border-t border-white/10 pt-6">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-neutral-300" />
                <span>Verified Patron Privilege</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-neutral-300" />
                <span>Archival Tier Allocation</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
                <span>White-Glove Priority Dispatch</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-20">
        {/* Subtle Dark Breadcrumb */}
        <div className="mb-8 opacity-80 hover:opacity-100 transition-opacity">
          <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Private Sale' }]} />
        </div>

        {/* State 1: Verification / Loading */}
        {eligibility.loading ? (
          <div className="py-28 text-center">
            <div className="w-16 h-16 rounded-full border border-white/20 bg-white/5 flex items-center justify-center mx-auto mb-5">
              <RefreshCw className="w-7 h-7 animate-spin text-white" />
            </div>
            <h3 className="text-base sm:text-lg font-light tracking-[0.18em] uppercase text-white">
              Authenticating Client Privilege...
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 font-light tracking-wide">
              Checking account verification and purchase history
            </p>
          </div>
        ) : !eligibility.eligible ? (
          /* State 2: Gated Access Screen */
          <div className="py-12 max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-white/0 p-8 sm:p-12 backdrop-blur-xl text-center shadow-2xl overflow-hidden"
            >
              {/* Subtle ambient light behind icon */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

              <div className="w-16 h-16 rounded-full border border-white/20 bg-white/10 flex items-center justify-center mx-auto mb-6 text-white shadow-inner">
                {eligibility.requiresLogin ? (
                  <Lock className="w-7 h-7 stroke-[1.5]" />
                ) : eligibility.requiresVerification ? (
                  <Mail className="w-7 h-7 stroke-[1.5]" />
                ) : (
                  <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
                )}
              </div>

              {eligibility.requiresLogin ? (
                <>
                  <span className="inline-block text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-neutral-400 font-medium mb-3">
                    Authentication Required
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-light tracking-[0.18em] uppercase text-white mb-3">
                    Private Client Access
                  </h2>
                  <p className="text-neutral-300 text-xs sm:text-sm mb-8 max-w-md mx-auto leading-relaxed font-light">
                    DENFiT Private Sale allocations are reserved strictly for registered members. Sign in to your account to unveil private archive selections.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      to="/auth?redirect=/private-sale"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-8 py-3 text-[11px] md:text-xs uppercase tracking-[0.24em] font-medium hover:bg-neutral-200 transition shadow-lg"
                    >
                      <span>Sign In to Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/sale"
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent text-neutral-300 hover:text-white px-8 py-3 text-[11px] md:text-xs uppercase tracking-[0.24em] hover:bg-white/10 transition"
                    >
                      Browse Seasonal Sale
                    </Link>
                  </div>
                </>
              ) : eligibility.requiresVerification ? (
                <>
                  <span className="inline-block text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-neutral-400 font-medium mb-3">
                    Verification Required
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-light tracking-[0.18em] uppercase text-white mb-3">
                    Confirm Email Address
                  </h2>
                  <p className="text-neutral-300 text-xs sm:text-sm mb-8 max-w-md mx-auto leading-relaxed font-light">
                    Your account ({user?.email}) requires email confirmation before private archive pricing can be unlocked.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      to="/profile"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-8 py-3 text-[11px] md:text-xs uppercase tracking-[0.24em] font-medium hover:bg-neutral-200 transition shadow-lg"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Verify in Profile</span>
                    </Link>
                    <Link
                      to="/shop"
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent text-neutral-300 hover:text-white px-8 py-3 text-[11px] md:text-xs uppercase tracking-[0.24em] hover:bg-white/10 transition"
                    >
                      Continue Shopping
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <span className="inline-block text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-neutral-400 font-medium mb-3">
                    Patron Requirement
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-light tracking-[0.18em] uppercase text-white mb-3">
                    Exclusive Patron Reserve
                  </h2>
                  <p className="text-neutral-300 text-xs sm:text-sm mb-8 max-w-md mx-auto leading-relaxed font-light">
                    Private Sale access activates automatically following your first DENFiT order. Explore our catalog to place your initial qualifying order.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      to="/shop"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-8 py-3 text-[11px] md:text-xs uppercase tracking-[0.24em] font-medium hover:bg-neutral-200 transition shadow-lg"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Explore Collection</span>
                    </Link>
                    <Link
                      to="/sale"
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent text-neutral-300 hover:text-white px-8 py-3 text-[11px] md:text-xs uppercase tracking-[0.24em] hover:bg-white/10 transition"
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
          <div className="space-y-8">
            {/* Filter & Sort Bar */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-5 py-2 rounded-full text-xs font-medium tracking-[0.18em] uppercase transition-all whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-white text-black shadow-md'
                        : 'border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sort & Search */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search archive..."
                    className="w-36 sm:w-44 px-4 py-2 text-xs rounded-full border border-white/15 bg-neutral-900/80 text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 tracking-wide"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="px-4 py-2 text-xs rounded-full border border-white/15 bg-neutral-900/80 text-neutral-200 focus:outline-none focus:border-white/40 uppercase tracking-[0.14em] cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {productsLoading ? (
              <div className="py-28 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-white mx-auto mb-3" />
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">Loading private archive pieces...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-16 text-center max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-full border border-white/15 bg-white/5 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                  <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-light tracking-[0.18em] uppercase text-white mb-2">
                  No Archive Pieces Found
                </h3>
                <p className="text-neutral-400 text-xs sm:text-sm max-w-sm mx-auto mb-6 font-light leading-relaxed">
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
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent text-white px-6 py-2 text-xs uppercase tracking-[0.20em] hover:bg-white/10 transition"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6 px-1">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-400 font-light">
                    Presenting <span className="text-white font-medium">{filteredProducts.length}</span> Exclusive Allocation{filteredProducts.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 font-light hidden sm:block">
                    Limited Run • Hand Finished
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product._id || product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivateSale;
