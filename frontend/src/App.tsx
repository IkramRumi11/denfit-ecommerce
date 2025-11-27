// src/App.tsx
import { createBrowserRouter, RouterProvider, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Page Components
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Wishlist from './pages/Wishlist';
import Profile from './pages/Profile';
import AuthPage from './pages/AuthPage'; // Unified login/signup/forgot/reset
import About from './pages/About';
import Contact from './pages/Contact';

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

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { SearchProvider, useSearch } from './context/SearchContext';
import { FeatureProvider } from './context/FeatureContext';

function AppContent() {
  useSearch();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

    return (
    <div className="min-h-screen bg-white text-gray-900">
      {!isAdminRoute && <Header />}

      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:productId" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

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
            <Route path="users" element={<AdminUsers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductCreate />} />
            <Route path="products/:id/edit" element={<AdminProductEdit />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="audits" element={<AdminAudits />} />
          </Route>
        </Routes>
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

  return (
    <AuthProvider>
      <SearchProvider>
        <FeatureProvider>
        <RouterProvider router={router} />
        </FeatureProvider>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;
