import React from 'react';
import { Home, Users, Box, ShoppingCart, Settings, Shield } from 'lucide-react';

export type AdminMenuItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  // Optional permission key required to view this menu item. If omitted, visible to admins.
  permission?: string;
};

// Canonical admin menu used across layout and pages to avoid duplication
const adminMenu: AdminMenuItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { to: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" />, permission: 'users.view' },
  { to: '/admin/products', label: 'Products', icon: <Box className="w-5 h-5" />, permission: 'products.view' },
  { to: '/admin/orders', label: 'Orders', icon: <ShoppingCart className="w-5 h-5" />, permission: 'orders.view' },
  { to: '/admin/audits', label: 'Audits', icon: <Shield className="w-5 h-5" />, permission: 'audits.view' },
  { to: '/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, permission: 'settings.view' },
  { to: '/admin/features', label: 'Features', icon: <Settings className="w-5 h-5" />, permission: 'settings.view' },
];

export default adminMenu;
