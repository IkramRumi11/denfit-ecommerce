// frontend/src/components/admin/QuickLinks.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import adminMenu from '../../layouts/AdminLayout/adminMenu';
import { useAuth } from '../../context/AuthContext';

const isAllowed = (user: any, permission?: string) => {
  // If no permission is set on the menu item, default to admin-only visibility.
  if (!permission) return user?.role === 'admin';
  // If user has explicit permissions array, check it.
  if (Array.isArray(user?.permissions)) return user.permissions.includes(permission) || user.role === 'admin';
  // Fallback: admin role has access
  return user?.role === 'admin';
};

const QuickLinks: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const items = adminMenu.filter(m => m.to !== '/admin' && isAllowed(user, m.permission));

  if (!items.length) return null;

  return (
    <section className="mb-4" aria-labelledby="quick-links-heading">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 id="quick-links-heading" className="font-bold text-gray-900">Quick Links</h2>
            <div className="text-sm text-gray-500">Jump to common admin sections</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3" role="list" aria-labelledby="quick-links-heading">
          {items.map((m) => (
            <button
              key={m.to}
              onClick={() => navigate(m.to)}
              role="listitem"
              aria-label={`Go to ${m.label}`}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50 transition flex items-center gap-2"
            >
              <span aria-hidden className="w-5 h-5 text-gray-600">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickLinks;
