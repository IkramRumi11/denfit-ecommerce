// frontend/src/pages/admin/AdminDashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminNoteModal from "../../components/admin/AdminNoteModal";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";

// Components
import StatsCard from "../../components/admin/dashboard/StatsCard";
import RevenueChart from "../../components/admin/dashboard/RevenueChart";
import RecentOrdersTable from "../../components/admin/dashboard/RecentOrdersTable";
import DashboardNotifications from "../../components/admin/dashboard/DashboardNotifications";
import TopProductsList from "../../components/admin/dashboard/TopProductsList";

// ==================== TYPES ====================
type Stats = {
  users: number;
  products: number;
  orders: number;
  revenue: number;
  growth: {
    users: number;
    products: number;
    orders: number;
    revenue: number;
  };
};

type SalesData = {
  date: string;
  sales: number;
  orders: number;
  visitors: number;
};

type TopProduct = {
  id: string;
  name: string;
  category: string;
  sales: number;
  revenue: number;
  image?: string;
  stock: number;
  trend: "up" | "down" | "stable";
  rating: number;
};

type RecentOrder = {
  id: string;
  customer: string;
  email: string;
  items: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  date: string;
  payment: "paid" | "pending" | "failed";
};

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
};

// ==================== UTILITIES ====================
const formatPKR = (value = 0) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value);

const formatShort = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
};

const timeAgo = (dateStr: string) => {
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diff = now - past;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

// ==================== MAIN DASHBOARD COMPONENT ====================
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    users: 0,
    products: 0,
    orders: 0,
    revenue: 0,
    growth: { users: 0, products: 0, orders: 0, revenue: 0 }
  });

  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalOrder, setModalOrder] = useState<RecentOrder | null>(null);
  const [modalTargetStatus, setModalTargetStatus] = useState<string>('');

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          api.admin.getDashboardStats(),
          api.admin.getRecentActivities(),
        ]);

        if (statsRes?.data) {
          const overview = statsRes.data.overview;
          const charts = statsRes.data.charts;
          const recent = statsRes.data.recent;

          // Update stats
          setStats({
            users: overview.totalUsers || 0,
            products: overview.totalProducts || 0,
            orders: overview.totalOrders || 0,
            revenue: overview.totalRevenue || 0,
            growth: {
              users: 8.2, // TODO: Calculate from historical data
              products: 3.4,
              orders: 12.7,
              revenue: 15.3,
            }
          });

          // Convert weekly sales
          if (charts.weeklySales) {
            const sales = charts.weeklySales.map((item: any) => ({
              date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              sales: item.sales || 0,
              orders: item.orders || 0,
              visitors: 0,
            }));
            setSalesData(sales);
          }

          // Convert top products
          if (charts.topProducts) {
            const products = charts.topProducts.map((item: any) => ({
              id: item._id || item.product?._id || '',
              name: item.product?.name || item.name || 'Unknown',
              category: item.product?.category || 'Uncategorized',
              sales: item.sold || item.totalSold || 0,
              revenue: item.totalRevenue || 0,
              image: item.product?.images?.[0] || item.image || '🛍️',
              stock: item.product?.stockQuantity || 0,
              trend: 'up' as const,
              rating: item.product?.rating || 4.5,
            }));
            setTopProducts(products);
          }

          // Convert recent orders
          if (recent.recentOrders) {
            const orders = recent.recentOrders.map((order: any) => ({
              id: order._id || order.orderNumber || '',
              customer: order.customer?.name || 'Unknown',
              email: order.customer?.email || '',
              items: order.items?.length || 0,
              total: order.total || 0,
              status: (order.status || 'pending') as RecentOrder['status'],
              date: order.createdAt || new Date().toISOString(),
              payment: (order.paymentStatus || 'pending') as RecentOrder['payment'],
            }));
            setRecentOrders(orders);
          }
        }

        // Update notifications
        if (activitiesRes?.data) {
          const notifs: Notification[] = (activitiesRes.data as any[]).slice(0, 5).map((activity: any, index: number) => ({
            id: `n${index + 1}`,
            title: 'New Activity',
            message: activity.orderNumber ? `Order ${activity.orderNumber} - ${activity.status}` : 'System activity',
            time: activity.createdAt ? timeAgo(activity.createdAt) : 'just now',
            type: activity.status === 'delivered' ? 'success' : activity.status === 'cancelled' ? 'error' : 'info',
            read: false,
          }));
          setNotifications(notifs);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [showToast]);

  const exportCSV = useCallback(() => {
    const csv = ["date,sales,orders,visitors", ...salesData.map((r) =>
      `${r.date},${r.sales},${r.orders},${r.visitors}`
    )].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `denfit-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully!', 'success');
  }, [salesData, showToast]);

  const handleStatusChange = (order: RecentOrder, newStatus: string) => {
    setModalOrder(order);
    setModalTargetStatus(newStatus);
    setModalOpen(true);
  };

  const confirmStatusChange = async (note?: string) => {
    if (!modalOrder) return;

    setLoading(true);
    try {
      await api.admin.updateOrderStatus(modalOrder.id, modalTargetStatus, note);

      setRecentOrders(prev =>
        prev.map(order =>
          order.id === modalOrder.id ? { ...order, status: modalTargetStatus as any } : order
        )
      );

      showToast('Order status updated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      showToast(error?.message || 'Failed to update order status', 'error');
    } finally {
      setLoading(false);
      setModalOpen(false);
    }
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
        />
        <div className="text-gray-700 font-semibold">Loading Dashboard...</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your store today.</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600">Today</div>
            <div className="font-semibold text-gray-900">{new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={formatPKR(stats.revenue)}
          change={stats.growth.revenue}
          icon="💰"
          color="green"
        />
        <StatsCard
          title="Total Orders"
          value={formatShort(stats.orders)}
          change={stats.growth.orders}
          icon="📦"
          color="blue"
        />
        <StatsCard
          title="Active Users"
          value={formatShort(stats.users)}
          change={stats.growth.users}
          icon="👥"
          color="purple"
        />
        <StatsCard
          title="Products"
          value={formatShort(stats.products)}
          change={stats.growth.products}
          icon="🛍️"
          color="yellow"
        />
      </section>

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Analytics */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-bold text-gray-900 text-lg">Revenue Analytics</div>
                <div className="text-sm text-gray-600">Revenue vs Orders - Last 7 Days</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => navigate("/admin/audits")}
                  className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all font-medium"
                >
                  View Reports
                </button>
              </div>
            </div>
            <RevenueChart data={salesData} />
          </div>

          {/* Recent Orders */}
          <RecentOrdersTable
            orders={recentOrders}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          {/* Notifications */}
          <DashboardNotifications
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
          />

          {/* Top Products */}
          <TopProductsList products={topProducts} />

          {/* Quick Stats / Performance Summary */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <div className="font-bold text-lg mb-4">Performance Summary</div>
            <div className="space-y-3">
              {[
                { label: "Conversion Rate", value: "3.2%", change: "+0.4%" },
                { label: "Avg. Order Value", value: formatPKR(4520), change: "+5.2%" },
                { label: "Customer Satisfaction", value: "4.8/5", change: "+0.1" },
              ].map((stat, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-blue-100 text-sm">{stat.label}</span>
                  <div className="text-right">
                    <div className="font-semibold">{stat.value}</div>
                    <div className="text-blue-200 text-xs">{stat.change}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/admin/audits")}
              className="w-full mt-4 bg-white text-blue-600 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition-all"
            >
              View Detailed Analytics
            </button>
          </div>
        </div>
      </section>

      {/* Status Change Modal */}
      <AdminNoteModal
        order={modalOrder || { id: '', status: '', customer: '' }}
        to={modalTargetStatus}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmStatusChange}
        isOpen={modalOpen}
      />
    </div>
  );
};

export default AdminDashboard;