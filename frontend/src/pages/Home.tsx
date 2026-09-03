// src/pages/LuxuryHomePage.tsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Product } from "../types";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  Star,
  TrendingUp,
  Plus,
  X,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { api } from "../api";
import { primaryImage, productId, priceNumber } from "../utils/productHelpers";
import {
  getCategoryGroup,
  getDisplaySizesForProduct,
  getAvailableSizesForProduct,
} from "../utils/sizeRules";
import { getAvailableStockForItem, isOutOfStock, isLowStock, getAvailableQuantity } from '../utils/stockHelpers';
import { getColorName } from '../utils/colorNames';

const LuxuryHomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { addItem, getItemQuantity, items } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Quick-add overlay state
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [qaSelectedSize, setQaSelectedSize] = useState<string>("");
  const [qaSelectedColor, setQaSelectedColor] = useState<string>("");
  const [qaSelectedColorName, setQaSelectedColorName] = useState<string>("");
  const [qaSelectedVariantId, setQaSelectedVariantId] = useState<string>("");

  const heroSlides = useMemo(
    () => [
      {
        image:
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=90",
        title: "TIMELESS ELEGANCE",
        subtitle: "Fall / Winter 2026 Maison Collection",
        tagline: "Tailored silhouettes, sculpted in light.",
        cta: "Discover Women",
        link: "/shop?gender=women",
      },
      {
        image:
          "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=90",
        title: "CRAFTED PERFORMANCE",
        subtitle: "Precision Engineered Athletic Couture",
        tagline: "Where motion meets meticulous craft.",
        cta: "Explore Men",
        link: "/shop?gender=men",
      },
      {
        image:
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=90",
        title: "REFINED YOUTH",
        subtitle: "Exclusive Atelier Kids Edition",
        tagline: "Playful forms, uncompromised fabrics.",
        cta: "Shop Kids",
        link: "/shop?gender=kids",
      },
    ],
    []
  );

  const defaultCollections = useMemo(
    () => [
      {
        image:
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
        title: "Men's Atelier",
        category: "men",
        description: "Tailored essentials, sharp lines.",
        badge: "NEW SEASON",
      },
      {
        image:
          "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80",
        title: "Women's Couture",
        category: "women",
        description: "Fluid drapery, modern silhouettes.",
        badge: "ICONIC",
      },
      {
        image:
          "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80",
        title: "Kids Studio",
        category: "kids",
        description: "Soft textures, playful design.",
        badge: "EDIT",
      },
      {
        image:
          "https://images.unsplash.com/photo-1519744792095-2f2205e87b6f?w=800&q=80",
        title: "Accessories Edit",
        category: "accessories",
        description: "Finishing touches, everyday essentials.",
        badge: "NEW",
      },
      {
        image:
          "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",
        title: "Private Sale",
        category: "sale",
        description: "Curated pieces, rare prices.",
        badge: "-40% OFF",
      },
    ],
    []
  );

  const [collectionsState, setCollectionsState] = useState(() => defaultCollections);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.products.getAll({ limit: 50 });
        const products = response?.data?.products || [];

        const featured = products
          .filter((p: Product) => Boolean(p.featured))
          .slice(0, 4);
        const trending = products
          .filter(
            (p: any) =>
              Boolean(p.trending || (p.ratings && p.ratings.average >= 4.5))
          )
          .slice(0, 4);

        setFeaturedProducts(featured.length ? featured : products.slice(0, 4));
        setTrendingProducts(trending.length ? trending : products.slice(4, 8));
      } catch (error) {
        console.error("Error fetching products:", error);
        showToast("Unable to load products", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [showToast]);

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleAddToCart = (product: Product) => {
    // Determine colors list
    const colorsList = (product.variants && product.variants.length) ? product.variants : (product.colors || []);
    let initialColor = '';
    let initialColorName = '';
    let initialVariantId = '';

    if (colorsList.length > 0) {
      const firstInStockColor = colorsList.find((c: any) => {
        const hex = c?.hex || c?.normalizedHex || c?.value;
        const name = c?.name || c?.displayName || hex;
        const vId = c?._id || c?.id;
        return getAvailableStockForItem(product, { color: hex || name, colorName: name, variantId: vId }) > 0;
      }) || colorsList[0];

      if (firstInStockColor) {
        const hex = firstInStockColor?.hex || firstInStockColor?.normalizedHex || firstInStockColor?.value;
        const name = firstInStockColor?.name || firstInStockColor?.displayName || hex;
        initialColor = hex || name || '';
        initialColorName = String(name || hex || '');
        if (product.variants && product.variants.length) {
          initialVariantId = String(firstInStockColor._id || firstInStockColor.id || '');
        }
      }
    }

    const allSizes = getDisplaySizesForProduct(product as any);
    const firstInStockSize = allSizes.find((s: string) => {
      return getAvailableStockForItem(product, { size: s, color: initialColor, colorName: initialColorName, variantId: initialVariantId }) > 0;
    }) || allSizes[0] || '';

    setQaSelectedSize(firstInStockSize);
    setQaSelectedColor(initialColor);
    setQaSelectedColorName(initialColorName);
    setQaSelectedVariantId(initialVariantId);
    setQuickAddProduct(product);
  };

  const closeQuickAdd = () => {
    setQuickAddProduct(null);
    setQaSelectedSize("");
    setQaSelectedColor("");
    setQaSelectedColorName("");
    setQaSelectedVariantId("");
  };

  const confirmQuickAdd = (product: Product) => {
    if (!qaSelectedSize) {
      showToast("Please select a size", "error");
      return;
    }

    // If product has colors/variants, require explicit color/variant selection
    const hasColors = (product as any).variants?.length || (product as any).colors?.length;
    if (hasColors && !qaSelectedVariantId && !qaSelectedColor) {
      showToast('Please select a color', 'error');
      return;
    }

    const currentStock = getAvailableStockForItem(product, {
      size: qaSelectedSize,
      color: qaSelectedColor,
      colorName: qaSelectedColorName,
      variantId: qaSelectedVariantId
    });

    if (currentStock <= 0) {
      showToast("Selected color/size is out of stock", "error");
      return;
    }

    const imageSrc = primaryImage(product) || "https://via.placeholder.com/300";
    const price = priceNumber(product);

    // Resolve variant if qaSelectedVariantId or qaSelectedColor provided
    let variantSnapshot: any = undefined;
    if ((product as any).variants) {
      variantSnapshot = (product as any).variants.find((v: any) => {
        const key = String(qaSelectedVariantId || qaSelectedColor || '').toLowerCase();
        return key && (String(v._id || v.id).toLowerCase() === key || String(v.hex || v.normalizedHex || v.value || '').toLowerCase() === key || String(v.name || '').toLowerCase() === key);
      });
    }

    const colorNormalized = variantSnapshot ? (variantSnapshot.hex || variantSnapshot.name) : (qaSelectedColorName || qaSelectedColor || undefined);

    const res = addItem({
      productId: product._id ?? product.id ?? "",
      name: String(product.name),
      price,
      image: imageSrc,
      size: qaSelectedSize,
      color: colorNormalized,
      colorName: variantSnapshot?.name || qaSelectedColorName || undefined,
      variantId: variantSnapshot?.id || qaSelectedVariantId || undefined,
      variantName: variantSnapshot?.name || undefined,
      variantHex: variantSnapshot?.hex || undefined,
      quantity: 1,
      maxStock: currentStock
    }, currentStock);

    if (!res.success) {
      if (res.reason === 'MAX_REACHED') {
        showToast(`You already have all ${currentStock} available units in your cart`, "warning");
      } else {
        showToast("Product is out of stock", "error");
      }
      return;
    }

    showToast(`${String(product.name)} added to the cart`, "success");
    closeQuickAdd();
  };

  const formatPrice = (price: number) => `₨${price.toLocaleString()}`;

  // Carousel refs + state for featured & trending
  const featuredRef = useRef<HTMLDivElement | null>(null);
  const trendingRef = useRef<HTMLDivElement | null>(null);
  const collectionsRef = useRef<HTMLDivElement | null>(null);
  const [featuredHover, setFeaturedHover] = useState(false);
  const [trendingHover, setTrendingHover] = useState(false);
  const [collectionsHover, setCollectionsHover] = useState(false);

  const scrollByAmount = useCallback((container: HTMLElement | null, amount: number) => {
    if (!container) return;
    container.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  const scrollNext = useCallback((container: HTMLElement | null) => {
    if (!container) return;
    const item = container.querySelector('[data-carousel-item]') as HTMLElement | null;
    const step = (item?.clientWidth || container.clientWidth) ;
    scrollByAmount(container, step);
  }, [scrollByAmount]);

  const scrollPrev = useCallback((container: HTMLElement | null) => {
    if (!container) return;
    const item = container.querySelector('[data-carousel-item]') as HTMLElement | null;
    const step = (item?.clientWidth || container.clientWidth) ;
    scrollByAmount(container, -step);
  }, [scrollByAmount]);

  // Autoplay: advance every 5s when not hovered
  useEffect(() => {
    const container = featuredRef.current;
    if (!container) return;
    const id = window.setInterval(() => {
      if (!featuredHover) scrollNext(container);
    }, 5000);
    return () => clearInterval(id);
  }, [featuredRef, featuredHover, scrollNext]);

  useEffect(() => {
    const container = collectionsRef.current;
    if (!container) return;
    const id = window.setInterval(() => {
      if (!collectionsHover) scrollNext(container);
    }, 5000);
    return () => clearInterval(id);
  }, [collectionsRef, collectionsHover, scrollNext]);

  // Fetch collections from API (fallback to defaults)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await api.collections.getAll();
        // API may return { data: { collections } } or { collections }
        const cols = (res && res.data && Array.isArray(res.data.collections)) ? res.data.collections : (Array.isArray(res?.collections) ? res.collections : []);
        if (!mounted) return;
        if (cols && cols.length) {
          const mapped = cols.slice(0, 5).map((c: any) => ({
            image: c.image || c.banner || c.imageUrl || c.featuredImage || defaultCollections[0].image,
            title: c.title || c.name || c.handle || c.slug || 'Collection',
            category: c.slug || c.handle || c.id || (c.name || '').toLowerCase(),
            description: c.description || '',
            badge: c.badge || c.tag || '',
          }));
          setCollectionsState(mapped);
        }
      } catch (e) {
        // keep defaults
        console.debug('Collections API failed, using defaults', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const container = trendingRef.current;
    if (!container) return;
    const id = window.setInterval(() => {
      if (!trendingHover) scrollNext(container);
    }, 5000);
    return () => clearInterval(id);
  }, [trendingRef, trendingHover, scrollNext]);

  const ProductCard = ({ product }: { product: Product }) => {
    const imageSrc = primaryImage(product) || "https://via.placeholder.com/300";
        const isQuickOpen = quickAddProduct && (quickAddProduct._id ?? quickAddProduct.id) === (product._id ?? product.id);

        // compute pricing/discount for badge
        const pPrice = priceNumber(product);
        const pOriginal = (product as any).originalPrice || (product as any).compareAtPrice || undefined;
        const pDiscount = pOriginal && pOriginal > pPrice ? Math.round(((pOriginal - pPrice) / pOriginal) * 100) : 0;

        const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
        const isWishlisted = typeof isInWishlist === 'function' ? isInWishlist(productId(product)) : false;
        const inCartTotal = getItemQuantity(productId(product));

        const handleWishlistToggle = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (isWishlisted) {
            removeFromWishlist(productId(product));
            showToast('Removed from wishlist', 'info');
          } else {
            addToWishlist({
              id: productId(product),
              name: product.name,
              price: priceNumber(product),
              image: primaryImage(product),
              category: product.category ?? '',
              rating: (product as any).rating,
            });
            showToast('Added to wishlist!', 'success');
          }
        };

    return (
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="group cursor-pointer rounded-3xl border border-white/5 bg-gradient-to-b from-white/5 via-white/0 to-white/5 p-4 backdrop-blur-sm touch-manipulation"
        style={{ touchAction: 'pan-y' }}
      >
        <div 
          className="relative overflow-hidden mb-4 aspect-[3/4] rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900"
          style={{ touchAction: 'pan-y' }}
        >
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-auto"
            style={{ touchAction: 'pan-y' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />

            {/* Mobile: use the main Add button to open quick-add overlay; no separate plus button */}

          <div className="absolute top-4 left-4 flex flex-col gap-2 text-[11px] uppercase tracking-[0.001em] text-white/80">
            {inCartTotal > 0 && (
              <span className="rounded-full bg-blue-600/90 text-white font-medium px-3 py-1 backdrop-blur-sm shadow-sm">
                {inCartTotal} in cart
              </span>
            )}
            {product?.inStock ? (
              <span className="rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
                In stock
              </span>
            ) : (
              <span className="rounded-full bg-red-600/80 px-3 py-1 backdrop-blur-sm">
                Waitlist
              </span>
            )}
            {pDiscount > 0 && (
  <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm text-black text-[13px] font-bold uppercase tracking-wider">
    -{pDiscount}%
  </span>
)}

            {((product as any).ratings || (product as any).rating) && (() => {
                const avg = (product as any).ratings?.average ?? (product as any).rating;
                const count = (product as any).ratings?.count;
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                    <Star
                      size={12}
                      className="fill-yellow-400 text-yellow-400 shrink-0"
                    />
                    {avg ? Number(avg).toFixed(1) : "-"}
                    {count > 0 ? (
                      <>
                        {' '}
                        • {count}
                      </>
                    ) : null}
                  </span>
                );
              })()}
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleWishlistToggle}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 transition-all z-10"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4 opacity-100 translate-y-0 md:opacity-0 md:translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => navigate(`/product/${productId(product)}`)}
                className="flex-1 bg-white text-black px-5 py-2 text-xs md:text-sm rounded-full uppercase tracking-[0.18em] hover:bg-neutral-200 transition"
                aria-label={`View details for ${product.name}`}
              >
                View details
              </button>
              {!isOutOfStock(product) && (
                <button
                  onClick={() => handleAddToCart(product)}
                  className={`flex items-center justify-center gap-2 px-5 py-2 text-xs md:text-sm rounded-full uppercase tracking-[0.18em] transition border ${
                    inCartTotal > 0 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500' 
                      : 'bg-black/80 text-white hover:bg-black border-white/10'
                  }`}
                  aria-label={`Add ${product.name} to cart`}
                >
                  <ShoppingBag size={14} />
                  {inCartTotal > 0 ? `${inCartTotal} in Cart` : 'Add'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-1">
            <h3 className="text-[13px] md:text-sm mb-1 text-gray-900 tracking-[0.16em] uppercase line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-3 mb-1">
            <p className="text-lg font-semibold tracking-wide">
              {formatPrice(product.price)}
            </p>
            {product.originalPrice &&
              product.originalPrice > product.price && (
                <p className="text-xs text-neutral-500 line-through">
                  {formatPrice(product.originalPrice)}
                </p>
              )}
          </div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-[0.22em]">
            Denfit Studio • Edition 2026
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-black via-neutral-950 to-black text-black overflow-x-clip">
      {/* Hero Section */}
      <section className="relative h-[75vh] sm:h-[85vh] md:h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          {heroSlides.map(
            (slide, index) =>
              index === currentSlide && (
                <motion.div
                  key={index}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 1 }}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center scale-110"
                    style={{ backgroundImage: `url(${slide.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/50 to-black/90" />

                  <div className="relative h-full max-w-7xl mx-auto flex flex-col justify-between px-6 pt-12 md:pt-20 pb-16 md:px-10 text-white">
                    {/* Top mini-bar */}
                    <div className="flex items-center justify-between text-[11px] tracking-[0.22em] uppercase text-neutral-300">
                      <span className="flex items-center gap-2">
                        <span className="h-[1px] w-10 bg-neutral-500" />
                        Denfit Maison
                      </span>
                      <span className="hidden md:inline-flex items-center gap-3">
                        <span className="h-[1px] w-10 bg-neutral-500" />
                        Edition 2026 • Online Exclusive
                      </span>
                    </div>

                    {/* Main hero content */}
                    <motion.div
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 1 }}
                      className="flex-1 flex flex-col md:flex-row md:items-end gap-10 md:gap-16"
                    >
                      <div className="md:w-[60%] lg:w-[55%]">
                        <p className="mb-5 text-[11px] tracking-[0.28em] uppercase text-neutral-300">
                          New Season Capsule
                        </p>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light leading-[1.05] tracking-[0.22em]">
                          {slide.title}
                        </h1>
                        <p className="mt-6 text-base md:text-lg text-neutral-200 max-w-xl">
                          {slide.subtitle}
                        </p>
                        <p className="mt-2 text-sm md:text-base text-neutral-300 max-w-xl">
                          {slide.tagline}
                        </p>

                        <div className="mt-10 flex flex-wrap items-center gap-4">
                          <Link
                            to={slide.link}
                            className="inline-flex items-center gap-3 rounded-full bg-white text-black px-10 py-3 text-[11px] md:text-xs uppercase tracking-[0.26em] hover:bg-neutral-200 transition"
                          >
                            {slide.cta}
                            <ArrowRight size={16} />
                          </Link>
                          <Link
                            to="/shop"
                            className="inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-[0.26em] text-neutral-200 hover:text-white"
                          >
                            View all pieces
                            <span className="h-[1px] w-10 bg-neutral-400" />
                          </Link>
                        </div>
                      </div>

                      <div className="md:w-[40%] lg:w-[35%] flex flex-col gap-4">
                        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md px-6 py-5 max-w-sm self-end">
                          <p className="text-[11px] tracking-[0.28em] uppercase text-neutral-300 mb-2">
                            Denfit Signature
                          </p>
                          <p className="text-sm text-neutral-100">
                            Hand-finished garments crafted in limited runs, for
                            collectors of everyday luxury.
                          </p>
                          <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-300">
                            <span>Express shipping worldwide</span>
                            <span className="h-[1px] w-6 bg-neutral-500" />
                            <span>14‑day returns</span>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-4 justify-end text-[11px] tracking-[0.26em] text-neutral-400">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-[1px] w-8 bg-neutral-500" />
                            0{currentSlide + 1} • 0{heroSlides.length}
                          </span>
                          <div className="flex gap-1.5">
                            {heroSlides.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCurrentSlide(i)}
                                className={`h-[2px] w-8 transition-all ${
                                  i === currentSlide
                                    ? "bg-white"
                                    : "bg-white/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )
          )}
        </AnimatePresence>

        {/* Hero Controls */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4 md:px-8">
          <button
            onClick={() =>
              setCurrentSlide(
                (prev) => (prev - 1 + heroSlides.length) % heroSlides.length
              )
            }
            className="pointer-events-auto hidden sm:inline-flex items-center justify-center bg-black/35 hover:bg-black/55 border border-white/15 p-3 rounded-full backdrop-blur-sm transition"
            aria-label="Previous slide"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() =>
              setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
            }
            className="pointer-events-auto hidden sm:inline-flex items-center justify-center bg-black/35 hover:bg-black/55 border border-white/15 p-3 rounded-full backdrop-blur-sm transition"
            aria-label="Next slide"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </section>

      {/* Brand Strip */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex flex-wrap items-center justify-between gap-4 text-[10px] md:text-[11px] tracking-[0.26em] uppercase text-gray-500">
          <span className="flex items-center gap-2">
            <span className="h-[1px] w-6 bg-neutral-500" />
            Ethically sourced fabrics
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[1px] w-6 bg-neutral-500" />
            Free shipping over ₨5,000
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[1px] w-6 bg-neutral-500" />
            Premium gift packaging
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[1px] w-6 bg-neutral-500" />
            24/7 concierge support
          </span>
        </div>
      </section>

        {/* Collections */}
        <section className="py-16 md:py-20 px-6 md:px-10 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 mb-10 md:mb-12">
            <div>
              <p className="text-[11px] tracking-[0.32em] uppercase text-gray-600 mb-3">
                Curated Universes
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.25em]">
                SHOP BY CATEGORY
              </h2>
            </div>
              <p className="max-w-md text-sm text-gray-600">
              Discover tailored edits for every chapter of your day: elevated
              essentials, statement pieces, and effortless layers.
            </p>
          </div>

          <div className="relative">
            <button
              aria-label="Collections prev"
              onClick={() => {
                const c = collectionsRef.current;
                if (!c) return;
                scrollPrev(c);
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white ml-2"
            >
              <ChevronLeft size={18} />
            </button>

            <div
              ref={collectionsRef}
              onMouseEnter={() => setCollectionsHover(true)}
              onMouseLeave={() => setCollectionsHover(false)}
              className="scroll-smooth snap-x snap-mandatory overflow-x-auto no-scrollbar px-0 flex gap-4 touch-pan-y touch-manipulation"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              {collectionsState.map((c, i) => (
                <div key={i} data-carousel-item className="snap-start flex-shrink-0 w-full md:w-1/2 lg:w-1/4 px-2" style={{ touchAction: 'pan-y' }}>
                  <a
                      href={typeof window !== 'undefined' ? `http://${window.location.host}${(['men','women','kids','sale','accessories'].includes(c.category) ? `/${c.category}` : `/shop?gender=${c.category}`)}` : (['men','women','kids','sale','accessories'].includes(c.category) ? `/${c.category}` : `/shop?gender=${c.category}`)}
                      className="relative group block overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-white/5 via-white/0 to-white/5 touch-manipulation"
                      style={{ touchAction: 'pan-y' }}
                    >
                    <div className="relative overflow-hidden aspect-[3/4]" style={{ touchAction: 'pan-y' }}>
                      <img
                        src={c.image}
                        alt={c.title}
                        className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-110 pointer-events-auto"
                        style={{ touchAction: 'pan-y' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/85 group-hover:via-black/60 transition-colors pointer-events-none" />
                      <div className="absolute top-5 left-5">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 text-[10px] uppercase tracking-[0.26em] text-neutral-100">
                          <span className="h-1 w-1 rounded-full bg-emerald-300" />
                          {c.badge}
                        </span>
                      </div>
                      <div className="absolute bottom-7 left-6 right-6 text-left">
                        <h3 className="text-2xl font-light mb-1 tracking-[0.16em] uppercase text-white">
                          {c.title}
                        </h3>
                        <p className="text-sm text-neutral-300 mb-4">
                          {c.description}
                        </p>
                        <span className="inline-flex items-center gap-3 text-[11px] tracking-[0.26em] uppercase text-neutral-100">
                          Shop the edit
                          <ArrowRight
                            size={16}
                            className="transform group-hover:translate-x-1 transition-transform"
                          />
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>

            <button
              aria-label="Collections next"
              onClick={() => {
                const c = collectionsRef.current;
                if (!c) return;
                scrollNext(c);
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white mr-2"
            >
              <ChevronRight size={18} />
            </button>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-20 px-6 md:px-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-10 md:mb-12">
            <div>
              <p className="text-[11px] tracking-[0.32em] uppercase text-gray-600 mb-3">
                Editor’s Spotlight
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.2em]">
                FEATURED PIECES
              </h2>
              <p className="mt-3 text-sm text-gray-600 max-w-md">
                A handpicked selection of signature silhouettes, crafted in
                luxurious fabrics and refined finishes.
              </p>
            </div>
            <a
              href={typeof window !== 'undefined' ? `http://${window.location.host}/shop` : '/shop'}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-gray-700 hover:text-black"
            >
              View entire collection
              <ArrowRight size={16} />
            </a>
          </div>

          <div className="relative">
            <button
              aria-label="Featured prev"
              onClick={() => scrollPrev(featuredRef.current)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white ml-2"
            >
              <ChevronLeft size={18} />
            </button>
            <div
              ref={featuredRef}
              onMouseEnter={() => setFeaturedHover(true)}
              onMouseLeave={() => setFeaturedHover(false)}
              className="scroll-smooth snap-x snap-mandatory overflow-x-auto no-scrollbar px-0 flex gap-4 touch-pan-y touch-manipulation"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              {loading
                ? [...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="snap-start flex-shrink-0 w-full md:w-1/2 lg:w-1/4 px-2"
                    >
                      <div className="animate-pulse rounded-3xl border border-white/5 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 aspect-[3/4]" />
                    </div>
                  ))
                : featuredProducts.map((p) => (
                    <div key={productId(p)} data-carousel-item className="snap-start flex-shrink-0 w-full md:w-1/2 lg:w-1/4 px-2">
                      <ProductCard product={p} />
                    </div>
                  ))}
            </div>
            <button
              aria-label="Featured next"
              onClick={() => scrollNext(featuredRef.current)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white mr-2"
            >
              <ChevronRight size={18} />
            </button>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}`}</style>
          </div>
        </div>
      </section>

        {/* Trending Products */}
        <section className="py-16 md:py-20 px-6 md:px-10 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-10 md:mb-12">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-400 text-black">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-[11px] tracking-[0.32em] uppercase text-gray-500 mb-2">
                  Community Favourites
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.2em]">
                  TRENDING NOW
                </h2>
                <p className="mt-2 text-sm text-gray-600 max-w-md">
                  Pieces our clients reach for again and again – high‑rotation
                  essentials and statement icons.
                </p>
              </div>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-gray-700 hover:text-black"
            >
              Explore more
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="relative">
            <button
              aria-label="Trending prev"
              onClick={() => scrollPrev(trendingRef.current)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 border border-gray-200 ml-2"
            >
              <ChevronLeft size={18} />
            </button>
            <div
              ref={trendingRef}
              onMouseEnter={() => setTrendingHover(true)}
              onMouseLeave={() => setTrendingHover(false)}
              className="scroll-smooth snap-x snap-mandatory overflow-x-auto no-scrollbar px-0 flex gap-4 touch-pan-y touch-manipulation"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              {loading
                ? [...Array(4)].map((_, i) => (
                    <div
                      key={i}
                              className="snap-start flex-shrink-0 w-full md:w-1/2 lg:w-1/4 px-2"
                    >
                              <div className="animate-pulse rounded-3xl border border-gray-100 bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-100 aspect-[3/4]" />
                    </div>
                  ))
                : trendingProducts.map((p) => (
                    <div key={productId(p)} data-carousel-item className="snap-start flex-shrink-0 w-full md:w-1/2 lg:w-1/4 px-2">
                      <ProductCard product={p} />
                    </div>
                  ))}
            </div>
            <button
              aria-label="Trending next"
              onClick={() => scrollNext(trendingRef.current)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white text-gray-800 border border-gray-200 mr-2"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Quick Add Overlay */}
      {quickAddProduct && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeQuickAdd}
            aria-hidden
          />

          <div className="relative w-full md:max-w-xl bg-white rounded-t-xl md:rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{String(quickAddProduct.name)}</h3>
                <p className="text-sm text-gray-600 mt-1">Rs. {priceNumber(quickAddProduct).toLocaleString()}</p>
              </div>
              <button onClick={closeQuickAdd} className="text-gray-500 ml-4" aria-label="Close">
                ✕
              </button>
            </div>

            {/* Size selection */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-normal text-gray-700 uppercase tracking-wider">Size</span>
                {qaSelectedSize && (
                  <span className="text-xs text-gray-500">Selected: <span className="font-medium">{String(qaSelectedSize)}</span></span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const sizes = getDisplaySizesForProduct(quickAddProduct as any);
                  const variant = (quickAddProduct as any).variants && qaSelectedVariantId
                    ? (quickAddProduct as any).variants.find((x: any) => String(x._id || x.id) === String(qaSelectedVariantId))
                    : undefined;
                  const avail = getAvailableSizesForProduct(quickAddProduct as any, variant);
                  return sizes.map((s) => {
                    const isConfigured = avail.includes(s);
                    const sizeStock = getAvailableStockForItem(quickAddProduct, {
                      size: s,
                      color: qaSelectedColor,
                      colorName: qaSelectedColorName,
                      variantId: qaSelectedVariantId
                    });
                    const sizeInCart = getItemQuantity(productId(quickAddProduct), s, qaSelectedColor || qaSelectedColorName, qaSelectedVariantId);
                    const isAvailable = isConfigured && sizeStock > 0;
                    const isSelected = qaSelectedSize === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => isAvailable && setQaSelectedSize(String(s))}
                        disabled={!isAvailable}
                        title={!isAvailable ? `${s} (Out of stock)` : sizeInCart > 0 ? `${s} (${sizeInCart} in cart)` : s}
                        className={`relative h-9 min-w-[44px] px-3 rounded text-xs font-normal border transition-all duration-200 overflow-hidden ${
                          isSelected && isAvailable
                            ? 'bg-black text-white border-black'
                            : isAvailable
                            ? 'bg-white text-gray-800 border-gray-300 hover:border-gray-500'
                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className={!isAvailable ? 'line-through' : ''}>{String(s)}</span>
                        {sizeInCart > 0 && isAvailable && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                        {!isAvailable && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[140%] h-[1px] bg-gray-400/80 -rotate-45" />
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Color selection */}
            {(() => {
              const colorsList = (quickAddProduct.variants && quickAddProduct.variants.length)
                ? quickAddProduct.variants.map((v: any, idx: number) => ({
                    id: String(v._id || v.id || `var-${idx}`),
                    hex: v?.hex || v?.normalizedHex || v?.value,
                    name: getColorName(v?.name || v?.hex || `Color ${idx + 1}`),
                    rawName: v?.name || v?.hex || `Color ${idx + 1}`,
                    swatchImage: v?.swatchImage ? (typeof v.swatchImage === 'string' ? v.swatchImage : v.swatchImage.url) : undefined,
                    variantId: String(v._id || v.id || `var-${idx}`)
                  }))
                : (quickAddProduct.colors || []).map((c: any, idx: number) => ({
                    id: String(c._id || c.id || c.hex || `col-${idx}`),
                    hex: c?.hex || c?.normalizedHex || c?.value,
                    name: getColorName(c?.name || c?.displayName || c?.hex || `Color ${idx + 1}`),
                    rawName: c?.name || c?.displayName || c?.value || c?.hex || `Color ${idx + 1}`,
                    swatchImage: c?.swatchImage ? (typeof c.swatchImage === 'string' ? c.swatchImage : c.swatchImage.url) : undefined,
                    variantId: undefined
                  }));

              if (!colorsList || colorsList.length === 0) return null;

              return (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-gray-700 uppercase tracking-wider">Color</span>
                    {(qaSelectedColorName || qaSelectedColor) && (
                      <span className="text-xs text-gray-500">Selected: <span className="font-medium">{getColorName(qaSelectedColorName || qaSelectedColor)}</span></span>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {colorsList.map((c: any) => {
                      const isSelected = (qaSelectedVariantId && qaSelectedVariantId === c.id) || qaSelectedColor === c.hex || qaSelectedColor === c.rawName;
                      const colorStock = getAvailableStockForItem(quickAddProduct, {
                        color: c.hex || c.rawName,
                        colorName: c.name,
                        variantId: c.variantId
                      });
                      const isColorOutOfStock = colorStock <= 0;

                      return (
                        <div key={c.id} className="flex flex-col items-center gap-1.5 min-w-[60px]">
                          <button
                            type="button"
                            disabled={isColorOutOfStock}
                            onClick={() => {
                              if (isColorOutOfStock) return;
                              const colVal = c.hex || c.rawName || '';
                              const colName = c.name || '';
                              const vId = c.variantId || '';
                              setQaSelectedColor(colVal);
                              setQaSelectedColorName(colName);
                              setQaSelectedVariantId(vId);

                              const currentSizeStock = getAvailableStockForItem(quickAddProduct, {
                                size: qaSelectedSize,
                                color: colVal,
                                colorName: colName,
                                variantId: vId
                              });
                              if (currentSizeStock <= 0) {
                                const allSizes = getDisplaySizesForProduct(quickAddProduct as any);
                                const newSize = allSizes.find((s: string) => {
                                  return getAvailableStockForItem(quickAddProduct, { size: s, color: colVal, colorName: colName, variantId: vId }) > 0;
                                }) || '';
                                setQaSelectedSize(newSize);
                              }
                            }}
                            title={isColorOutOfStock ? `${c.name} (Out of stock)` : c.name}
                            className={`relative w-9 h-9 md:w-11 md:h-11 rounded-sm border overflow-hidden transition-all flex items-center justify-center ${
                              isColorOutOfStock
                                ? 'border-gray-200 opacity-40 grayscale-[40%] cursor-not-allowed bg-gray-100'
                                : isSelected
                                ? 'border-black ring-2 ring-black/20 shadow-sm cursor-pointer'
                                : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                            }`}
                            style={c.hex && !c.swatchImage ? { backgroundColor: c.hex } : undefined}
                            aria-label={String(c.name)}
                          >
                            {c.swatchImage ? (
                              <img src={c.swatchImage} alt={String(c.name)} className="w-full h-full object-cover" />
                            ) : c.hex ? null : (
                              <span className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-700 bg-gray-100">
                                {(c.name || '?').charAt(0)}
                              </span>
                            )}
                            {isSelected && !isColorOutOfStock && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-sm border border-white/40">
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                  <path d="M1 4L4 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                            {isColorOutOfStock && (
                              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[140%] h-[1.5px] bg-red-500/80 -rotate-45 shadow-[0_0_2px_rgba(0,0,0,0.4)]" />
                              </span>
                            )}
                          </button>
                          <span className={`text-[10px] text-center leading-tight px-1 ${isColorOutOfStock ? 'text-gray-400 line-through' : 'text-gray-700 font-normal'}`}>
                            {String(c.name)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="mt-6">
              {(() => {
                const currentStock = getAvailableStockForItem(quickAddProduct, {
                  size: qaSelectedSize,
                  color: qaSelectedColor,
                  colorName: qaSelectedColorName,
                  variantId: qaSelectedVariantId
                });
                const inCartQty = getItemQuantity(
                  productId(quickAddProduct),
                  qaSelectedSize,
                  qaSelectedColor || qaSelectedColorName,
                  qaSelectedVariantId
                );
                const isOutOfStockSelection = currentStock <= 0;
                const isAllInCart = currentStock > 0 && inCartQty >= currentStock;

                return (
                  <div>
                    {isAllInCart ? (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        All {currentStock} available units of this variant are already in your cart.
                      </div>
                    ) : inCartQty > 0 && !isOutOfStockSelection ? (
                      <p className="mb-2 text-xs text-blue-600 font-medium">
                        {inCartQty} currently in your cart ({currentStock - inCartQty} more available)
                      </p>
                    ) : null}

                    <button
                      onClick={() => confirmQuickAdd(quickAddProduct)}
                      disabled={
                        !qaSelectedSize ||
                        (((quickAddProduct as any).variants?.length || (quickAddProduct as any).colors?.length) && !qaSelectedVariantId && !qaSelectedColor) ||
                        isOutOfStockSelection ||
                        isAllInCart
                      }
                      className="w-full bg-black text-white py-3 rounded text-sm font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isOutOfStockSelection 
                        ? 'Out of stock' 
                        : isAllInCart 
                        ? 'All in Cart' 
                        : inCartQty > 0 
                        ? 'Add Another to Cart' 
                        : 'Add to cart'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default LuxuryHomePage;
