import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Search, UserPlus, Edit, Trash2, Ban, UserCheck, Mail, Phone, Calendar } from 'lucide-react';

const AdminUsers: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [banConfirm, setBanConfirm] = useState<{ id: string; action: 'ban' | 'unban' } | null>(null);

  const loadUsers = useCallback(async (p = 1, q = '', role = '') => {
    setLoading(true);
    try {
      const params: any = {
        page: p,
        limit: 20,
      };
      if (q) params.search = q;
      if (role) params.role = role;

      const res = await api.admin.getAllUsers(params);
      if (res?.data) {
        setUsers(res.data.users || []);
        setTotal(res.data.pagination?.total || 0);
        setPage(res.data.pagination?.current || p);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers(page, search, roleFilter);
  }, [page, search, roleFilter, loadUsers]);

  const handleSearch = () => {
    setPage(1);
    loadUsers(1, search, roleFilter);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.admin.deleteUser(id);
      showToast('User deleted successfully', 'success');
      loadUsers(page, search, roleFilter);
      setDeleteConfirm(null);
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete user', 'error');
    }
  };

  const handleBan = async (id: string, action: 'ban' | 'unban') => {
    try {
      if (action === 'ban') {
        await api.admin.banUser(id, 'Violation of terms');
        showToast('User banned successfully', 'success');
      } else {
        await api.admin.unbanUser(id);
        showToast('User unbanned successfully', 'success');
      }
      loadUsers(page, search, roleFilter);
      setBanConfirm(null);
    } catch (e: any) {
      showToast(e?.message || `Failed to ${action} user`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <LoadingSpinner size="xl" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Joined</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff&bold=true`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          {user.phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{user.email}</span>
                      </div>
                      {user.emailVerified && (
                        <span className="text-xs text-green-600">Verified</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role || 'customer'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.active !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.active !== false ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBanConfirm({ id: user._id, action: user.active !== false ? 'ban' : 'unban' })}
                          className={`p-2 rounded-lg transition-colors ${
                            user.active !== false
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.active !== false ? 'Ban user' : 'Unban user'}
                        >
                          {user.active !== false ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(user._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} users
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadUsers(page - 1, search, roleFilter)}
              disabled={page <= 1 || loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page - 2 + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => loadUsers(pageNum, search, roleFilter)}
                    className={`px-3 py-2 rounded-lg transition-all ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => loadUsers(page + 1, search, roleFilter)}
              disabled={page >= totalPages || loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete User</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone and will also delete all their orders.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban/Unban Confirmation Modal */}
      {banConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {banConfirm.action === 'ban' ? 'Ban User' : 'Unban User'}
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {banConfirm.action} this user?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBanConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBan(banConfirm.id, banConfirm.action)}
                className={`px-4 py-2 text-white rounded-lg transition-all ${
                  banConfirm.action === 'ban'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {banConfirm.action === 'ban' ? 'Ban' : 'Unban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
