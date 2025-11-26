// src/pages/LuxuryHomePage.tsx
import { useState, useEffect, useMemo } from "react";
import { Product } from "../types";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  Star,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { api } from "../api";
import { primaryImage, productId } from "../utils/productHelpers";

const LuxuryHomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const heroSlides = useMemo(
    () => [
      {
        image:
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=90",
        title: "TIMELESS ELEGANCE",
        subtitle: "Fall / Winter 2025 Maison Collection",
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

  const collections = useMemo(
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
          "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80",
        title: "Private Sale",
        category: "sale",
        description: "Curated pieces, rare prices.",
        badge: "-40% OFF",
      },
    ],
    []
  );

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
    if (!product.inStock || product.inventory === 0) {
      showToast("Product is out of stock", "error");
      return;
    }
    const imageSrc = primaryImage(product) || "https://via.placeholder.com/300";

    addItem({
      productId: product._id ?? product.id ?? "",
      name: product.name,
      price: product.price,
      image: imageSrc,
      size: "M",
      quantity: 1,
    });
    showToast(`${product.name} added to cart!`, "success");
  };

  const formatPrice = (price: number) => `₨${price.toLocaleString()}`;

  const ProductCard = ({ product }: { product: Product }) => {
    const imageSrc = primaryImage(product) || "https://via.placeholder.com/300";

    return (
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="group cursor-pointer rounded-3xl border border-white/5 bg-gradient-to-b from-white/5 via-white/0 to-white/5 p-4 backdrop-blur-sm"
      >
        <div className="relative overflow-hidden mb-4 aspect-[3/4] rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

          <div className="absolute top-4 left-4 flex flex-col gap-2 text-[11px] uppercase tracking-[0.18em] text-white/80">
            {product?.inStock ? (
              <span className="rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
                In stock
              </span>
            ) : (
              <span className="rounded-full bg-red-600/80 px-3 py-1 backdrop-blur-sm">
                Waitlist
              </span>
            )}
            {((product as any).ratings || (product as any).rating) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                <Star
                  size={12}
                  className="fill-yellow-400 text-yellow-400 shrink-0"
                />
                {((product as any).ratings?.average ?? (product as any).rating)
                  ? Number(((product as any).ratings?.average ?? (product as any).rating)).toFixed(1)
                  : "-"}{" "}
                • {(product as any).ratings?.count ?? ""}
              </span>
            )}
          </div>

          <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => navigate(`/product/${productId(product)}`)}
                className="flex-1 bg-white text-black px-5 py-2 text-xs md:text-sm rounded-full uppercase tracking-[0.18em] hover:bg-neutral-200 transition"
                aria-label={`View details for ${product.name}`}
              >
                View details
              </button>
              {product.inStock && (
                <button
                  onClick={() => handleAddToCart(product)}
                  className="flex items-center justify-center gap-2 bg-black/80 text-white px-5 py-2 text-xs md:text-sm rounded-full uppercase tracking-[0.18em] hover:bg-black transition border border-white/10"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <ShoppingBag size={14} />
                  Add
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-1">
            <h3 className="text-[13px] md:text-sm mb-1 text-neutral-100 tracking-[0.16em] uppercase line-clamp-2">
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
            Denfit Studio • Edition 2025
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-black via-neutral-950 to-black text-white overflow-hidden">
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

                  <div className="relative h-full max-w-7xl mx-auto flex flex-col justify-between px-6 pt-24 pb-16 md:px-10">
                    {/* Top mini-bar */}
                    <div className="flex items-center justify-between text-[11px] tracking-[0.22em] uppercase text-neutral-300">
                      <span className="flex items-center gap-2">
                        <span className="h-[1px] w-10 bg-neutral-500" />
                        Denfit Maison
                      </span>
                      <span className="hidden md:inline-flex items-center gap-3">
                        <span className="h-[1px] w-10 bg-neutral-500" />
                        Edition 2025 • Online Exclusive
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
      <section className="border-y border-white/5 bg-black/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex flex-wrap items-center justify-between gap-4 text-[10px] md:text-[11px] tracking-[0.26em] uppercase text-neutral-400">
          <span className="flex items-center gap-2">
            <span className="h-[1px] w-6 bg-neutral-500" />
            Ethically sourced fabrics
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[1px] w-6 bg-neutral-500" />
            Free shipping over ₨15,000
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
      <section className="py-16 md:py-20 px-6 md:px-10 bg-gradient-to-b from-black via-neutral-950 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 mb-10 md:mb-12">
            <div>
              <p className="text-[11px] tracking-[0.32em] uppercase text-neutral-400 mb-3">
                Curated Universes
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.25em]">
                SHOP BY CATEGORY
              </h2>
            </div>
            <p className="max-w-md text-sm text-neutral-300">
              Discover tailored edits for every chapter of your day: elevated
              essentials, statement pieces, and effortless layers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
            {collections.map((c, i) => (
              <Link
                key={i}
                to={`/shop?gender=${c.category}`}
                className="relative group overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-white/5 via-white/0 to-white/5"
              >
                <div className="relative overflow-hidden aspect-[3/4]">
                  <img
                    src={c.image}
                    alt={c.title}
                    className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/85 group-hover:via-black/60 transition-colors" />
                  <div className="absolute top-5 left-5">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 text-[10px] uppercase tracking-[0.26em] text-neutral-100">
                      <span className="h-1 w-1 rounded-full bg-emerald-300" />
                      {c.badge}
                    </span>
                  </div>
                  <div className="absolute bottom-7 left-6 right-6 text-left">
                    <h3 className="text-2xl font-light mb-1 tracking-[0.16em] uppercase">
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-20 px-6 md:px-10 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-10 md:mb-12">
            <div>
              <p className="text-[11px] tracking-[0.32em] uppercase text-neutral-400 mb-3">
                Editor’s Spotlight
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.2em]">
                FEATURED PIECES
              </h2>
              <p className="mt-3 text-sm text-neutral-300 max-w-md">
                A handpicked selection of signature silhouettes, crafted in
                luxurious fabrics and refined finishes.
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-neutral-200 hover:text-white"
            >
              View entire collection
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
            {loading
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-3xl border border-white/5 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 aspect-[3/4]"
                  />
                ))
                : featuredProducts.map((p) => (
                  <ProductCard key={productId(p)} product={p} />
                ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-16 md:py-20 px-6 md:px-10 bg-gradient-to-b from-neutral-950 via-black to-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-10 md:mb-12">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-400 text-black">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-[11px] tracking-[0.32em] uppercase text-neutral-400 mb-2">
                  Community Favourites
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.2em]">
                  TRENDING NOW
                </h2>
                <p className="mt-2 text-sm text-neutral-300 max-w-md">
                  Pieces our clients reach for again and again – high‑rotation
                  essentials and statement icons.
                </p>
              </div>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-neutral-200 hover:text-white"
            >
              Explore more
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
            {loading
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-3xl border border-white/5 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 aspect-[3/4]"
                  />
                ))
                : trendingProducts.map((p) => (
                  <ProductCard key={productId(p)} product={p} />
                ))}
          </div>
        </div>
      </section>

      
    </div>
  );
};

export default LuxuryHomePage;
