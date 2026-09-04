import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Package, 
  Heart, 
  Settings, 
  LogOut,
  Edit3,
  Mail
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getColorName } from '../utils/colorNames';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { EditProfileModal } from '../components/features/EditProfileModal';
import { ordersAPI } from '../api';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const { showToast } = useToast();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Live orders state (fetched from API) - keep hooks unconditional to avoid render-order issues
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!user) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setLoadingOrders(true);
    ordersAPI
      .getAll()
      .then((res: any) => {
        if (!mounted) return;
        setOrders(Array.isArray(res?.orders) ? res.orders : []);
        setLoadingOrders(false);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setOrdersError(err?.message || 'Failed to load orders');
        setLoadingOrders(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);
  // Safe array access with fallbacks
  const safeWishlistItems = Array.isArray(wishlistItems) ? wishlistItems : [];
  const wishlistCount = safeWishlistItems.length;

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm p-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Please log in to view your profile
          </h2>
          <Link
            to="/auth?mode=login"
            className="btn-primary"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Safe order count
  const orderCount = Array.isArray(orders) ? orders.length : 0;

  const handleLogout = () => {
    logout();
    setIsLogoutConfirmOpen(false);
    showToast('Logged out successfully', 'info');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'shipped':
        return 'Shipped';
      case 'processing':
        return 'Processing';
      default:
        return 'Pending';
    }
  };

  // Safe user data access
  const userName = user?.name || 'User';
  const userEmail = user?.email || 'No email provided';
  const userInitial = userName.charAt(0).toUpperCase();
  const formatMonthYear = (iso?: string) => {
    try {
      const d = iso ? new Date(iso) : new Date();
      if (isNaN(d.getTime())) return new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
      return d.toLocaleString('default', { month: 'short', year: 'numeric' });
    } catch (e) {
      return new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
    }
  };
  const memberSince = formatMonthYear(user?.createdAt);

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <p className="text-gray-600 mt-2">Manage your profile and orders</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              </div>

              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {userInitial}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{userName}</h3>
                    <p className="text-gray-600">{userEmail}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{userEmail}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Member since {memberSince}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
                <Link
                  to="/orders"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View All
                </Link>
              </div>

              {loadingOrders ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading orders...</p>
                </div>
              ) : orderCount === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No orders yet</p>
                  <Link
                    to="/shop"
                    className="btn-primary mt-4 inline-block"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: any) => {
                    const items = Array.isArray(order.items) ? order.items : [];
                    const first = items.length ? items[0] : null;
                    const firstImage = first?.image || (first?.images && first.images[0]) || first?.thumbnail || '';
                    const names = items.map((it: any) => it?.name || it?.title || it?.productName || '').filter(Boolean);
                    const visibleNamesCount = 2;
                    const visibleNames = names.slice(0, visibleNamesCount);
                    const remainingCount = Math.max(0, names.length - visibleNames.length);
                    const orderKey = order._id || order.id;
                    const orderIdDisplay = order.orderNumber || order.id || order._id || '';

                    return (
                      <div key={orderKey} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <Link to={`/orders/${orderKey}`} className="w-12 h-12 bg-blue-50 rounded-lg overflow-hidden flex-shrink-0">
                            {firstImage ? (
                              <img src={firstImage} alt={names[0] || 'Product image'} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-blue-600" />
                              </div>
                            )}
                          </Link>

                          <div className="min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{orderIdDisplay}</h4>
                            <p className="text-sm text-gray-600">{order.date}</p>

                            <div className="text-sm text-gray-900 mt-1">
                              {names.length > 0 && (
                                <>
                                  <div className="block sm:hidden truncate text-sm font-medium text-gray-900">{names[0]}</div>

                                  <div className="hidden sm:block truncate text-sm font-medium text-gray-900">
                                    {(() => {
                                      const joinedVisible = visibleNames.join(', ');
                                      if (remainingCount > 0) {
                                        return (
                                          <>
                                            <span className="truncate inline-block align-middle">{joinedVisible}</span>
                                            <span className="text-gray-500 mx-1">...</span>
                                            <Link to={`/orders/${orderKey}`} className="text-blue-600 hover:underline inline-block">+{remainingCount}</Link>
                                          </>
                                        );
                                      }
                                      return <span className="truncate">{joinedVisible}</span>;
                                    })()}
                                  </div>
                                </>
                              )}

                              {(() => {
                                const firstItem = first;
                                if (!firstItem) return null;
                                const colorObj = firstItem.color && typeof firstItem.color === 'object' ? firstItem.color : null;
                                const colorName = firstItem.colorName || (colorObj ? (colorObj.name || undefined) : undefined);
                                const variantName = firstItem.variantName || undefined;
                                const variantHex = firstItem.variantHex || (colorObj ? (colorObj.hex || undefined) : undefined);
                                const colorValue = typeof firstItem.color === 'string' ? firstItem.color : (variantHex || undefined);
                                let label = variantName || colorName || '';
                                if (!label && typeof firstItem.color === 'string') label = getColorName(firstItem.color);
                                const displayLabel = getColorName(label);
                                return (
                                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
                                    {firstItem.size ? <span>Size: {firstItem.size}</span> : null}
                                    {firstItem.size && displayLabel ? <span>•</span> : null}
                                    {displayLabel ? (
                                      <span className="inline-flex items-center gap-1">
                                        Color: 
                                        {colorValue ? (
                                          <span className="w-3 h-3 rounded-full border inline-block" style={{ backgroundColor: String(colorValue) }} />
                                        ) : null}
                                        <span className="capitalize">{displayLabel}</span>
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          <p className="text-sm text-gray-900 font-medium mt-1">
                            {items.length} items • Rs {Number(order.customerTotal != null ? order.customerTotal : (Number(order.discountAmount || 0) > 0 ? Math.max(0, Number(order.subtotal || 0) - Number(order.discountAmount || 0)) + Number(order.shippingCost || 0) : (order.total || order.totalAmount || 0))).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/wishlist"
                  className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Heart className="h-5 w-5 text-red-500" />
                  <span>Wishlist ({wishlistCount})</span>
                </Link>

                <Link
                  to="/orders"
                  className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Package className="h-5 w-5 text-blue-500" />
                  <span>Order History</span>
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Settings className="h-5 w-5 text-gray-500" />
                  <span>Account Settings</span>
                </Link>
              </div>
            </div>

            {/* Account Stats */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Account Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Orders</span>
                  <span className="font-semibold text-gray-900">{orderCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Wishlist Items</span>
                  <span className="font-semibold text-gray-900">{wishlistCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-semibold text-gray-900">{memberSince}</span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="w-full flex items-center gap-3 p-4 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sign Out?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
