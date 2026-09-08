import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Plus,
  Search,
  Trash2,
  Edit,
  ExternalLink,
  Package,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Layers,
  ArrowRight,
  Eye
} from 'lucide-react';
import { api } from '../../api';
import { Product } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatCurrency';

const formatPrice = (val: number | string | undefined | null): string => {
  if (val == null || val === '') return '₨0';
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isNaN(num) ? '₨0' : formatCurrency(num);
};

export const AdminPrivateSale: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Add Product Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateProducts, setCandidateProducts] = useState<Product[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Latest request tracking
  const latestRequestRef = useRef(0);

  // Load Private Sale products
  const loadPrivateSaleProducts = useCallback(async (p = 1, q = '', cat = '', st = '') => {
    const reqId = ++latestRequestRef.current;
    setLoading(true);
    try {
      const params: any = {
        page: p,
        limit: 20,
      };
      if (q) params.search = q;
      if (cat) params.category = cat;
      if (st) params.status = st;

      const res = await api.admin.getPrivateSaleProducts(params);
      if (reqId !== latestRequestRef.current) return;

      if (res?.data) {
        setProducts(res.data.products || []);
        setTotal(res.data.pagination?.total || 0);
        setPage(res.data.pagination?.current || p);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (e: any) {
      console.error('Failed to load private sale products:', e);
      showToast(e?.message || 'Failed to load Private Sale products', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPrivateSaleProducts(page, search, categoryFilter, statusFilter);
  }, [page, search, categoryFilter, statusFilter, loadPrivateSaleProducts]);

  const handleSearch = () => {
    setPage(1);
    loadPrivateSaleProducts(1, search, categoryFilter, statusFilter);
  };

  // Remove single product from Private Sale
  const handleRemoveFromPrivateSale = async (productId: string, productName: string) => {
    if (!confirm(`Remove "${productName}" from Private Sale? It will return to normal public catalogue.`)) {
      return;
    }
    try {
      await api.admin.updateProduct(productId, { privateSale: false });
      showToast(`Removed "${productName}" from Private Sale`, 'success');
      loadPrivateSaleProducts(page, search, categoryFilter, statusFilter);
    } catch (e: any) {
      showToast(e?.message || 'Failed to remove product from Private Sale', 'error');
    }
  };

  // Quick edit (e.g. status)
  const handleQuickStatus = async (productId: string, status: string) => {
    try {
      await api.admin.updateProduct(productId, { status });
      showToast('Product status updated', 'success');
      loadPrivateSaleProducts(page, search, categoryFilter, statusFilter);
    } catch (e: any) {
      showToast(e?.message || 'Failed to update status', 'error');
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const all = products.reduce((acc, p) => ({ ...acc, [p._id || p.id || '']: true }), {} as Record<string, boolean>);
    setSelectedIds(all);
  };

  const clearSelection = () => setSelectedIds({});

  const getSelectedIds = () => Object.keys(selectedIds).filter((id) => selectedIds[id]);

  // Bulk operations
  const bulkRemovePrivateSale = async () => {
    const ids = getSelectedIds();
    if (!ids.length) return showToast('No products selected', 'warning');
    if (!confirm(`Remove ${ids.length} selected products from Private Sale?`)) return;

    try {
      const res = await api.admin.bulkUpdateProducts(ids, { privateSale: false });
      showToast(res?.message || `${ids.length} products removed from Private Sale`, 'success');
      clearSelection();
      loadPrivateSaleProducts(page, search, categoryFilter, statusFilter);
    } catch (e: any) {
      showToast(e?.message || 'Bulk operation failed', 'error');
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    const ids = getSelectedIds();
    if (!ids.length) return showToast('No products selected', 'warning');

    try {
      const res = await api.admin.bulkUpdateProducts(ids, { status });
      showToast(res?.message || `${ids.length} products updated to ${status}`, 'success');
      clearSelection();
      loadPrivateSaleProducts(page, search, categoryFilter, statusFilter);
    } catch (e: any) {
      showToast(e?.message || 'Bulk status update failed', 'error');
    }
  };

  // Modal: Load non-private-sale candidate products
  const loadCandidates = async (query = '') => {
    setCandidatesLoading(true);
    try {
      const params: any = {
        page: 1,
        limit: 15,
        privateSale: 'false',
      };
      if (query) params.search = query;
      const res = await api.admin.getAllProducts(params);
      if (res?.data?.products) {
        setCandidateProducts(res.data.products);
      }
    } catch (e) {
      console.error('Failed to load candidate products:', e);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
    setCandidateSearch('');
    loadCandidates('');
  };

  const handleAssignToPrivateSale = async (productId: string) => {
    setAddingId(productId);
    try {
      await api.admin.updateProduct(productId, { privateSale: true });
      showToast('Product added to Private Sale', 'success');
      // Update candidate list locally
      setCandidateProducts((prev) => prev.filter((p) => p._id !== productId));
      // Refresh main table in background
      loadPrivateSaleProducts(page, search, categoryFilter, statusFilter);
    } catch (e: any) {
      showToast(e?.message || 'Failed to add product to Private Sale', 'error');
    } finally {
      setAddingId(null);
    }
  };

  // Calculate quick metrics
  const publishedCount = products.filter((p) => p.status === 'published').length;
  const lowStockCount = products.filter((p) => (p as any).isLowStock || (p as any).isOutOfStock).length;
  const totalInventory = products.reduce((sum, p) => sum + (Number((p as any).availableQuantity ?? p.inventory) || 0), 0);

  const getPrimaryImage = (product: Product) => {
    if ((product as any).primaryImage) return (product as any).primaryImage;
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      return typeof img === 'string' ? img : (img as any).url || '/placeholder.png';
    }
    return (product as any).image || '/placeholder.png';
  };

  const selectedCount = getSelectedIds().length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Private Sale Management</h1>
              <p className="text-gray-600 mt-0.5 text-sm">
                Control VIP exclusive products, access rules, and promotional pricing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadPrivateSaleProducts(page, search, categoryFilter, statusFilter)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Assign Products to Private Sale
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-xs text-gray-500 font-medium">Total Private Sale Products</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{publishedCount}</div>
            <div className="text-xs text-gray-500 font-medium">Published on Storefront</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalInventory}</div>
            <div className="text-xs text-gray-500 font-medium">Available Units</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{lowStockCount}</div>
            <div className="text-xs text-gray-500 font-medium">Low / Out of Stock</div>
          </div>
        </div>
      </div>

      {/* Access Rule Notice */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-purple-200/60 rounded-full text-purple-800">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-sm text-purple-900">
            <span className="font-semibold">Backend Access Rule:</span> Products here are only accessible to{' '}
            <span className="font-medium underline">verified customers with at least 1 placed order</span>. All public product
            APIs automatically exclude them.
          </div>
        </div>
        <Link
          to="/private-sale"
          target="_blank"
          className="flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline whitespace-nowrap"
        >
          <span>Preview Customer Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name or SKU..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">All Categories</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="kids">Kids</option>
            <option value="fragrances">Fragrances</option>
            <option value="accessories">Accessories</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">All Publication Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-medium text-sm transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedCount > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-900">
            <span>{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
            <button onClick={clearSelection} className="text-xs text-purple-600 hover:underline">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkUpdateStatus('published')}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
            >
              Publish Selected
            </button>
            <button
              onClick={() => bulkUpdateStatus('draft')}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
            >
              Draft Selected
            </button>
            <button
              onClick={bulkRemovePrivateSale}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
            >
              Remove from Private Sale
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mb-3" />
            <p className="text-sm">Loading Private Sale products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Private Sale products found</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              You haven't assigned any products to Private Sale yet, or no products matched your filters.
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Assign Products Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedCount === products.length}
                      onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price / Discount</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {products.map((product) => {
                  const pid = product._id || product.id || '';
                  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
                  const discountPct = hasDiscount
                    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
                    : 0;
                  const avail = (product as any).availableQuantity ?? product.inventory ?? 0;
                  const isLow = (product as any).isLowStock;
                  const isOut = (product as any).isOutOfStock || avail <= 0;

                  return (
                    <tr key={pid} className="hover:bg-purple-50/20 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={!!selectedIds[pid]}
                          onChange={() => toggleSelect(pid)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getPrimaryImage(product)}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.png';
                            }}
                          />
                          <div>
                            <div className="font-semibold text-gray-900 line-clamp-1">{product.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{product.brand || 'DENFiT'}</span>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-semibold rounded">
                                Private Sale
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-600 text-xs font-mono">{product.seo?.slug || pid.slice(-8)}</td>

                      <td className="py-3 px-4 capitalize text-gray-700">
                        <div>{product.category || '—'}</div>
                        {(product as any).subcategory && (
                          <div className="text-xs text-gray-400 capitalize">{(product as any).subcategory}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{formatPrice(product.price)}</div>
                        {hasDiscount && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="line-through text-gray-400">{formatPrice(product.originalPrice!)}</span>
                            <span className="text-red-600 font-semibold text-[10px] bg-red-50 px-1 rounded">
                              -{discountPct}%
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'
                            }`}
                          >
                            {avail} units
                          </span>
                          {isOut ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-800 rounded font-medium">
                              Out
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
                              Low
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={product.status || 'published'}
                          onChange={(e) => handleQuickStatus(pid, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                            product.status === 'published'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : product.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/products/${pid}/edit`)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <Link
                            to={`/product/${product.seo?.slug || pid}`}
                            target="_blank"
                            className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View in Store"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleRemoveFromPrivateSale(pid, product.name)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove from Private Sale"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing page <span className="font-semibold">{page}</span> of{' '}
              <span className="font-semibold">{totalPages}</span> ({total} total products)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-xs font-medium"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-xs font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: Fast "Assign Products to Private Sale"               */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Assign Products to Private Sale</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Click "+ Add to Private Sale" to immediately convert any public product into an exclusive Private Sale item.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={candidateSearch}
                  onChange={(e) => {
                    setCandidateSearch(e.target.value);
                    loadCandidates(e.target.value);
                  }}
                  placeholder="Filter by product name, category, or SKU..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Modal Candidate List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {candidatesLoading ? (
                <div className="p-12 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                  <span className="text-xs">Finding available products...</span>
                </div>
              ) : candidateProducts.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  No eligible products found. All matching products may already be in Private Sale.
                </div>
              ) : (
                candidateProducts.map((p) => {
                  const pid = p._id || p.id || '';
                  const isAdding = addingId === pid;
                  return (
                    <div
                      key={pid}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/20 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getPrimaryImage(p)}
                          alt={p.name}
                          className="w-11 h-11 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.png';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">{p.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className="capitalize">{p.category || 'general'}</span>
                            <span>•</span>
                            <span className="font-semibold text-gray-800">{formatPrice(p.price)}</span>
                            {p.originalPrice && p.originalPrice > p.price && (
                              <span className="line-through text-gray-400">{formatPrice(p.originalPrice)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAssignToPrivateSale(pid)}
                        disabled={isAdding}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-semibold disabled:opacity-50 transition-colors flex-shrink-0"
                      >
                        {isAdding ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Private Sale</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrivateSale;
