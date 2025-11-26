import React, { useState } from 'react';
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
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { EditProfileModal } from '../components/features/EditProfileModal';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const { showToast } = useToast();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Safe array access with fallbacks
  const safeWishlistItems = Array.isArray(wishlistItems) ? wishlistItems : [];
  const wishlistCount = safeWishlistItems.length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm p-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Please log in to view your profile
          </h2>
          <Link
            to="/login"
            className="btn-primary"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Mock order history with safe array
  const orders = [
    {
      id: 'DENFIT-2024-001',
      date: 'Jan 15, 2024',
      status: 'delivered' as const,
      total: 14999,
      items: 3
    },
    {
      id: 'DENFIT-2024-002',
      date: 'Feb 2, 2024',
      status: 'shipped' as const,
      total: 8949,
      items: 2
    }
  ];

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
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
                      <span className="text-gray-600">Member since 2024</span>
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

              {orderCount === 0 ? (
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
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{order.id}</h4>
                          <p className="text-sm text-gray-600">{order.date}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <p className="text-sm text-gray-900 font-medium mt-1">
                          {order.items} items • Rs {order.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
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
                  <span className="font-semibold text-gray-900">2024</span>
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
