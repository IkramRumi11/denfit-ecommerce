// src/App.tsx
import React from 'react';
import { createBrowserRouter, RouterProvider, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Page Components
import Home from './pages/Home';
import Men from './pages/men';
import Women from './pages/women';
import Kids from './pages/kids';
import Sale from './pages/Sale';
import Accessories from './pages/Accessories';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Wishlist from './pages/Wishlist';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import OrderDetail from './pages/OrderDetail';
import TrackingRedirect from './pages/TrackingRedirect';
import AuthPage from './pages/AuthPage'; // Unified login/signup/forgot/reset
import About from './pages/About';
import Contact from './pages/Contact';
import Careers from './pages/Carrers';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ReturnExchangePolicy from './pages/ReturnExchangePolicy';
import CategoryPage from './pages/CategoryPage';

// ✅ Fixed import — now points to the new world-class Admin Layout
import AdminLayout from './layouts/AdminLayout/AdminLayout';
import AdminRoute from './components/admin/AdminRoute';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductEdit from './pages/admin/AdminProductEdit';
import AdminProductCreate from './pages/admin/AdminProductCreate';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminAudits from './pages/admin/AdminAudits';
import AdminFeatures from './pages/admin/AdminFeatures';
import AdminSettings from './pages/admin/Settings';
import AdminStyleByYou from './pages/admin/AdminStyleByYou';
import AdminDetailTemplates from './pages/admin/AdminDetailTemplates';
import AdminReviews from './pages/admin/AdminReviews';
import EmailMarketingSubscribers from './pages/admin/EmailMarketingSubscribers';
import EmailMarketingCreate from './pages/admin/EmailMarketingCreate';
import EmailMarketingHistory from './pages/admin/EmailMarketingHistory';
import AdminFilters from './pages/admin/AdminFilters';
import AdminContentController from './pages/admin/AdminContentController';
import AdminPromoCodes from './pages/admin/AdminPromoCodes';
import AdminShipping from './pages/admin/AdminShipping';
import AdminFinancials from './pages/admin/AdminFinancials';

// Context Providers
// NOTE: AuthProvider and SearchProvider are in main.tsx — do not re-import here
import { useSearch } from './context/SearchContext';
import { FeatureProvider } from './context/FeatureContext';

function AppContent() {
  useSearch();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Ensure scroll restoration is manual and scroll to top on every route change.
  React.useEffect(() => {
    if ('scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch (e) {
        /* ignore */
      }
    }
  }, []);

  React.useEffect(() => {
    // Reliably reset scroll to top on every route change immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Also run on next animation frame in case animations/transitions delayed render
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    return () => cancelAnimationFrame(rafId);
  }, [location.pathname]);

  // If user clicks a link to the same page currently open, scroll to top.
  React.useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const anchor = (target.closest && target.closest('a')) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || anchor.href;
      if (!href) return;

      // ignore links with hashes (let browser handle in-page anchors)
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Normalize pathname (strip trailing slash)
        const normalize = (p: string) => (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p);
        if (normalize(url.pathname) === normalize(location.pathname) && !url.hash) {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
      } catch (e) {
        // invalid URL - ignore
      }
    };

    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [location.pathname]);

    return (
    <div className="min-h-screen bg-white text-gray-900">
      {!isAdminRoute && <Header />}

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.36 }}
        >
          <Routes location={location}>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:productId" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/track" element={<TrackingRedirect />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/returns" element={<ReturnExchangePolicy />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/men" element={<Men />} />
          <Route path="/men/:subcategory" element={<CategoryPage />} />
          <Route path="/women" element={<Women />} />
          <Route path="/women/:subcategory" element={<CategoryPage />} />
          <Route path="/kids" element={<Kids />} />
          <Route path="/kids/:subcategory" element={<CategoryPage />} />
          <Route path="/sale" element={<Sale />} />
          <Route path="/sale/:subcategory" element={<CategoryPage genderOverride="sale" />} />
          <Route path="/accessories" element={<Accessories />} />
          <Route path="/accessories/:subcategory" element={<CategoryPage genderOverride="accessories" />} />

          {/* Admin routes - Protected with AdminRoute */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="financials" element={<AdminFinancials />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductCreate />} />
            <Route path="products/:id/edit" element={<AdminProductEdit />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="shipping" element={<AdminShipping />} />
            <Route path="promo-codes" element={<AdminPromoCodes />} />
            <Route path="audits" element={<AdminAudits />} />
            <Route path="filters" element={/* Filters management */ <AdminFilters />} />
            <Route path="features" element={<AdminFeatures />} />
            <Route path="content-controller" element={<AdminContentController />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="style-by-you" element={<AdminStyleByYou />} />
            <Route path="detail-templates" element={/* lazy admin detail templates */ <React.Suspense fallback={<div>Loading...</div>}><AdminDetailTemplates /></React.Suspense>} />
            <Route path="email-marketing" element={<EmailMarketingSubscribers />} />
            <Route path="email-marketing/create" element={<EmailMarketingCreate />} />
            <Route path="email-marketing/history" element={<EmailMarketingHistory />} />
          </Route>
          </Routes>
        </motion.div>
      </AnimatePresence>

      {!isAdminRoute && <Footer />}
    </div>
  );
}

function App() {
  const router = createBrowserRouter(
    [{ path: '/*', element: <AppContent /> }],
    {
      future: {
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      },
    } as any
  );

  // NOTE: AuthProvider, SearchProvider, CartProvider, WishlistProvider, ToastProvider,
  // and NotificationProvider are already wrapped in main.tsx. Do NOT duplicate them here.
  return (
    <FeatureProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </FeatureProvider>
  );
}

export default App;
