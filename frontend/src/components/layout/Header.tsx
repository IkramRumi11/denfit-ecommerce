import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Search, User, Heart, Bell, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import CartSidebar, { CartButton } from "../cart/CartSidebar";
import PromoMarquee from '../PromoMarquee';
import SearchOverlay from "./SearchOverlay";
import MegaMenu from "./MegaMenu";
import { useSearch } from "../../context/SearchContext";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useToast } from "../../context/ToastContext";
import { useFeatures } from '../../context/FeatureContext';
import { productsAPI } from '../../api';
import { productId, primaryImage, priceNumber, slugify } from '../../utils/productHelpers';
import { megaMenuData } from "../../data/megaMenuData";

// ---------------------------------------------
// Category Data (for nav items only)
// ---------------------------------------------
const categories = [
  { name: "Men", slug: "men" },
  { name: "Women", slug: "women" },
  { name: "Kids", slug: "kids" },
  { name: "Accessories", slug: "accessories" },
  { name: "Fragrances", slug: "fragrances" },
  { name: "Sale", slug: "sale" },
  { name: "Brands", slug: "brands" },
];

// ---------------------------------------------
// Header Component
// ---------------------------------------------
export default function Header(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [megaIndex, setMegaIndex] = useState<string | null>(null);
  const [openMobileCat, setOpenMobileCat] = useState<number | null>(null);
  const [brands, setBrands] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<any[]>([]);

  // setQuery allows other components to read current search
  const { setQuery } = useSearch();
  const { items: wishlistItems, addToWishlist, removeFromWishlist } = useWishlist();
  const { user, logout } = useAuth();
  const { notifications, dismissNotification, clearNotifications } = useNotifications();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Load dynamically active brands from database
  useEffect(() => {
    let mounted = true;
    productsAPI.getBrands()
      .then((res: any) => {
        const list = (res && (res.data || res.brands)) || (Array.isArray(res) ? res : []);
        if (mounted && Array.isArray(list)) {
          setBrands(list.filter(Boolean));
        }
      })
      .catch((err) => {
        console.error("Failed to load active brands for header", err);
      });
    return () => { mounted = false; };
  }, []);

  // Suggestions will be fetched from the backend; do not seed with mock products
  // to avoid showing placeholder/mock items in the search overlay.
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Show verify reminder, but only once per user/session to avoid repeated toasts on
  // refresh or navigation. We use sessionStorage to persist 'shown' state for the
  // current tab and fall back to a per-render ref where sessionStorage isn't
  // available (e.g., tests or environments without a window).
  useEffect(() => {
    if (!user || user.verified) return;

    const uid = (user as any).id || (user as any)._id || (user as any).email || "unknown";
    const storageKey = `verifyToastShown:${uid}`;

    try {
      const alreadyShown = typeof window !== "undefined" && sessionStorage.getItem(storageKey);
      if (alreadyShown) return;
      showToast("Please verify your email to unlock all features.", "warning");
      sessionStorage.setItem(storageKey, "1");
    } catch (err) {
      // In test environments or if sessionStorage is not available, fallback to
      // a simple ref-based approach by using a non-persisted flag on the
      // document to prevent repeated toasts during the lifetime of the page.
      // Note: this is defensive and should not otherwise be needed in modern
      // browsers.
      const docKey = `verifyToastShown:${uid}:doc`;
      const globalObj: any = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      if (globalObj[docKey]) return;
      showToast("Please verify your email to unlock all features.", "warning");
      globalObj[docKey] = true;
    }
  }, [user, showToast]);

  // Handle outside clicks for notifications
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // Lock scroll when menu/search open
  useEffect(() => {
    document.body.style.overflow = mobileOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, searchOpen]);

  // Search logic
  const handleSearch = async (value: string) => {
    setQuery?.(value);
    if (!value || !value.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const res: any = await productsAPI.getAll({ search: value.trim(), limit: 6 });
      const products = res && res.products ? res.products : (res?.data?.products || []);
      setSuggestions(Array.isArray(products) ? products.slice(0, 6) : []);
    } catch (err) {
      console.error('Failed to fetch search suggestions', err);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (product: any) => {
    // Close search and navigate to product detail page to ensure full, consistent product data
    setSuggestions([]);
    setSearchOpen(false);
    navigate(`/product/${productId(product)}`);
  };

  // Wishlist toggle
  const handleToggleWishlist = (product: any) => {
    const pid = productId(product);
    const exists = wishlistItems.some((i: any) => i.id === pid);
    if (exists) {
      removeFromWishlist(pid);
      showToast("Removed from wishlist", "info");
    } else {
      addToWishlist({
        id: pid,
        name: product.name,
        price: priceNumber(product),
        image: primaryImage(product),
        category: product.category ?? '',
        rating: (product as any).rating,
      });
      showToast("Added to wishlist", "success");
    }
  };

  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;
  const { flags } = useFeatures();

  // ---------------------------------------------
  // RENDER
  // ---------------------------------------------
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Promo bar */}
      {/* Replaced static promo with dynamic multi-message marquee */}
      <PromoMarquee />

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Mobile left */}
          <div className="flex items-center gap-1 md:hidden">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 text-gray-700 hover:text-black">
              <Menu className="h-6 w-6" />
            </button>
            <button onClick={() => setSearchOpen(true)} className="p-1.5 text-gray-700 hover:text-black">
              <Search className="h-5 w-5" />
            </button>
          </div>

          {/* Logo */}
          {(() => {
            const href = typeof window !== 'undefined' ? `http://${window.location.host}/` : '/';
            return (
              <a
                href={href}
                className="absolute left-1/2 transform -translate-x-1/2 md:static md:transform-none flex items-center gap-2"
              >
                <img
                  src="https://i.ibb.co/ycZSHXMr/logo.png"
                  alt="DENFiT Logo"
                  className="h-10 w-auto object-contain"
                />
              </a>
            );
          })()}
          

          {/* Mobile right */}
          <div className="flex items-center gap-1 md:hidden ml-auto">
            <Link to="/wishlist" className="relative p-1.5 text-gray-700 hover:text-black">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to={user ? "/profile" : "/auth?mode=login"}
              className="p-1.5 text-gray-700 hover:text-black"
              title={user ? "My Account" : "Login / Signup"}
            >
              <User className="h-5 w-5" />
            </Link>

            <CartButton />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 space-x-8 font-medium">
            {categories.map((cat) => (
              <div key={cat.slug} onMouseEnter={() => setMegaIndex(cat.slug)}>
                {(() => {
                  const path = ['men','women','kids','sale','accessories','brands','fragrances'].includes(cat.slug)
                    ? `/${cat.slug}`
                    : `/shop?gender=${cat.slug}`;
                  return (
                    <Link
                      to={path}
                      onClick={() => setMegaIndex(null)}
                      className={`text-gray-700 hover:text-black ${
                        cat.slug === "sale" ? "text-red-600 hover:text-red-700" : ""
                      }`}
                    >
                      {cat.name}
                    </Link>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* Mega Menu */}
          <MegaMenu activeCategory={megaIndex} brands={brands} onClose={() => setMegaIndex(null)} />

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-1 md:gap-1.5 ml-auto">
            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button className="p-1.5 text-gray-700 hover:text-black rounded-full hover:bg-gray-100 transition-colors" onClick={() => setNotifOpen((s) => !s)}>
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg p-3 text-sm z-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <strong>Notifications</strong>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            clearNotifications();
                            showToast("Notifications cleared", "info");
                          }}
                          className="text-xs text-red-500"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="text-gray-400">No new notifications</div>
                    ) : (
                      <ul className="space-y-2 max-h-60 overflow-y-auto">
                        {notifications
                          .filter((n) => (n.type || '').toLowerCase() !== 'admin')
                          .map((n, idx) => {
                            const key = n._id || n.id || `notif-${idx}`;
                            const nid = n._id || n.id || null;
                            return (
                              <li key={key} className="flex items-start justify-between">
                                <div className="text-gray-700">
                                  <div className="font-semibold">{n.title}</div>
                                  {n.body && <div className="text-sm text-gray-600">{n.body}</div>}
                                </div>
                                <button
                                  onClick={() => dismissNotification(nid)}
                                  className="text-gray-400 hover:text-red-500 ml-3"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="p-1.5 text-gray-700 hover:text-black rounded-full hover:bg-gray-100 transition-colors" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </button>

            <Link to="/wishlist" className="relative p-1.5 text-gray-700 hover:text-black rounded-full hover:bg-gray-100 transition-colors">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to={user ? "/profile" : "/auth?mode=login"}
              className="p-1.5 text-gray-700 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
              title={user ? "My Account" : "Login / Signup"}
            >
              <User className="h-5 w-5" />
            </Link>

            <CartButton />
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            <aside className="relative z-50 bg-white w-full h-full overflow-y-auto shadow-lg">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <img
                    src="https://i.ibb.co/ycZSHXMr/logo.png"
                    alt="Denfit"
                    className="h-8 object-contain"
                  />
                  <span className="font-semibold">DENFiT</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSearchOpen(true)} className="p-2">
                    <Search className="h-5 w-5" />
                  </button>
                  <button onClick={() => setMobileOpen(false)} className="p-2">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <nav className="px-6 py-6 space-y-6 text-lg">
                {categories.map((cat, idx) => (
                  <div key={cat.slug}>
                    <button
                      onClick={() =>
                        setOpenMobileCat(openMobileCat === idx ? null : idx)
                      }
                      className="w-full flex justify-between items-center font-medium"
                    >
                      {cat.name}
                      <ChevronRight
                        className={`h-5 w-5 transition-transform ${
                          openMobileCat === idx ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    {openMobileCat === idx && (
                      <div className="pl-4 mt-2 space-y-2">
                        {cat.slug === 'brands' ? (
                          <>
                            <Link
                              to="/brands"
                              onClick={() => setMobileOpen(false)}
                              className="block text-sm font-medium text-gray-900 py-1"
                            >
                              View Brands Hub
                            </Link>
                            {brands.length === 0 ? (
                              <p className="text-xs text-gray-400 py-1">No brands available</p>
                            ) : (
                              <div className="space-y-1 mt-1">
                                {brands.map((brand) => (
                                  <Link
                                    key={brand}
                                    to={`/shop?brand=${encodeURIComponent(brand)}`}
                                    onClick={() => setMobileOpen(false)}
                                    className="block text-sm text-gray-600 py-1 hover:text-black"
                                  >
                                    {brand}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {(() => {
                              const path = ['men','women','kids','sale','accessories','brands','fragrances'].includes(cat.slug)
                                ? `/${cat.slug}`
                                : `/shop?gender=${cat.slug}`;
                              return (
                                <Link
                                  to={path}
                                  onClick={() => setMobileOpen(false)}
                                  className="block text-sm font-medium text-gray-900"
                                >
                                  Shop All {cat.name}
                                </Link>
                              );
                            })()}

                            {/* Subcategories */}
                            {(() => {
                              const menu = megaMenuData[cat.slug as keyof typeof megaMenuData];
                              if (!menu) return null;
                              return Object.entries(menu.categories).map(([section, items]) => (
                                <div key={section}>
                                  <h6 className="text-sm font-bold text-gray-900 underline mt-3 mb-2">
                                    {section}
                                  </h6>
                                  {(items as string[]).map((item) => {
                                          const sectionSlug = String(slugify(section || '')).toLowerCase();
                                          const genderForLink = ['men','women','kids'].includes(sectionSlug) ? sectionSlug : cat.slug;
                                          const isFragrance = item.toLowerCase() === 'fragrances' || item.toLowerCase() === 'fragrance';
                                          const path = isFragrance
                                            ? (['men','women','kids'].includes(genderForLink) ? `/fragrances?gender=${genderForLink}` : '/fragrances')
                                            : `/shop?gender=${genderForLink}&type=${encodeURIComponent(slugify(item))}`;
                                          return (
                                            <Link
                                              key={item}
                                              to={path}
                                              onClick={() => setMobileOpen(false)}
                                              className="block text-sm text-gray-600 py-1 hover:text-black"
                                            >
                                              {item}
                                            </Link>
                                          );
                                  })}
                                </div>
                              ));
                            })()}

                            {/* Featured Link */}
                            {(() => {
                              const menu = megaMenuData[cat.slug as keyof typeof megaMenuData];
                              if (!menu?.featured) return null;
                                  return (
                                    <div className="pt-3 mt-3 border-t border-gray-200">
                                      <Link
                                        to={String(menu.featured.link || '/')}
                                        onClick={() => setMobileOpen(false)}
                                        className="block text-sm font-medium text-blue-600 hover:underline"
                                      >
                                        {menu.featured.title}
                                      </Link>
                                    </div>
                                  );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div className="border-t pt-4">
                  <h4 className="text-sm text-gray-500 mb-2">Account</h4>
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2"
                      >
                        Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2"
                      >
                        My Orders
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setMobileOpen(false);
                          showToast("Logged out successfully", "info");
                        }}
                        className="block py-2 text-red-600"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/auth?mode=login"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2"
                      >
                        Login
                      </Link>
                      <Link
                        to="/auth?mode=signup"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}

                  <Link
                    to="/wishlist"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2"
                  >
                    <Heart className="h-5 w-5" /> Favorites ({wishlistCount})
                  </Link>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          clearNotifications();
                          showToast("Notifications cleared", "info");
                        }}
                        className="text-xs text-red-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                      {notifications.length === 0 ? (
                        <p className="text-gray-400">No new notifications</p>
                      ) : (
                        notifications
                          .filter((n) => (n.type || '').toLowerCase() !== 'admin')
                          .map((n, idx) => {
                            const key = n._id || n.id || `mnotif-${idx}`;
                            const nid = n._id || n.id || null;
                            return (
                              <div key={key} className="flex justify-between items-start">
                                <span>
                                  <div className="font-semibold">{n.title}</div>
                                  {n.body && <div className="text-sm text-gray-600">{n.body}</div>}
                                </span>
                                <button
                                  onClick={() => {
                                    dismissNotification(nid);
                                    showToast("Notification dismissed", "info");
                                  }}
                                  className="ml-3 text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })
                      )}
                  </div>
                </div>
              </nav>

              <div className="p-6 border-t">
                <Link
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2"
                >
                  Contact / Support
                </Link>
                <p className="text-xs text-gray-400 mt-4">
                  © {new Date().getFullYear()} DENFiT. All rights reserved.
                </p>
              </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        suggestions={suggestions}
        onSearch={handleSearch}
        onSuggestionClick={handleSuggestionClick}
        handleToggleWishlist={handleToggleWishlist}
      />
      {/* Global Cart Sidebar Drawer */}
      <CartSidebar drawerOnly />
    </header>
  );
}
