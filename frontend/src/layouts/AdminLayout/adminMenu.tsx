// frontend/src/layouts/AdminLayout/adminMenu.ts
import React from 'react';
import { 
  Home, 
  Users, 
  Package, 
  ShoppingCart, 
  ShieldCheck, 
  Mail,
  Settings, 
  Zap,
  Megaphone,
  Tag,
  Truck,
  TrendingUp
} from 'lucide-react';

export type AdminMenuItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
};

// ✅ Real-world enterprise menu — ordered by usage frequency
const adminMenu: AdminMenuItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { to: '/admin/financials', label: 'Financials & Revenue', icon: <TrendingUp className="w-5 h-5" />, permission: 'orders.view' },
  { to: '/admin/orders', label: 'Orders', icon: <ShoppingCart className="w-5 h-5" />, permission: 'orders.view' },
  { to: '/admin/shipping', label: 'Shipping Settings', icon: <Truck className="w-5 h-5" />, permission: 'settings.view' },
  { to: '/admin/promo-codes', label: 'Promo Codes', icon: <Tag className="w-5 h-5" />, permission: 'products.view' },
  { to: '/admin/reviews', label: 'Reviews', icon: <Users className="w-5 h-5" />, permission: 'reviews.manage' },
  { to: '/admin/products', label: 'Products', icon: <Package className="w-5 h-5" />, permission: 'products.view' },
  { to: '/admin/users', label: 'Customers', icon: <Users className="w-5 h-5" />, permission: 'users.view' },
  { to: '/admin/audits', label: 'Security Logs', icon: <ShieldCheck className="w-5 h-5" />, permission: 'audits.view' },
  { to: '/admin/features', label: 'Feature Flags', icon: <Zap className="w-5 h-5" />, permission: 'features.manage' },
  { to: '/admin/content-controller', label: 'Content Controller', icon: <Megaphone className="w-5 h-5" />, permission: 'products.view' },
  { to: '/admin/email-marketing', label: 'Email Marketing', icon: <Mail className="w-5 h-5" />, permission: 'email.marketing' },
  { to: '/admin/settings', label: 'System Settings', icon: <Settings className="w-5 h-5" />, permission: 'settings.view' },
  { to: '/admin/style-by-you', label: 'Style By You', icon: <Package className="w-5 h-5" />, permission: 'products.view' },
  { to: '/admin/detail-templates', label: 'Detail Templates', icon: <Zap className="w-5 h-5" />, permission: 'products.view' },
];

export default adminMenu;