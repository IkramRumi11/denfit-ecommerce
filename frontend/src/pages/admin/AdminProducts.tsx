import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Search, Plus, Edit, Trash2, Eye, Package, DollarSign, TrendingUp, Star, Image as ImageIcon, AlertCircle } from 'lucide-react';

const AdminProducts: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async (p = 1, q = '', category = '', status = '') => {
    setLoading(true);
    try {
      const params: any = {
        page: p,
        limit: 20,
      };
      if (q) params.search = q;
      if (category) params.category = category;
      if (status) params.status = status;

      const res = await api.admin.getAllProducts(params);
      if (res?.data) {
        setProducts(res.data.products || []);
        setTotal(res.data.pagination?.total || 0);
        setPage(res.data.pagination?.current || p);
        setTotalPages(res.data.pagination?.pages || 1);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load(page, search, categoryFilter, statusFilter);
  }, [page, search, categoryFilter, statusFilter, load]);

  const handleSearch = () => {
    setPage(1);
    load(1, search, categoryFilter, statusFilter);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.admin.deleteProduct(id);
      showToast('Product deleted successfully', 'success');
      load(page, search, categoryFilter, statusFilter);
      setDeleteConfirm(null);
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete product', 'error');
    }
  };

  const handleQuickEdit = async (productId: string, field: string, value: any) => {
    try {
      await api.admin.updateProduct(productId, { [field]: value });
      showToast('Product updated successfully', 'success');
      load(page, search, categoryFilter, statusFilter);
    } catch (e: any) {
      showToast(e?.message || 'Failed to update product', 'error');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPrimaryImage = (product: any) => {
    if (product.images && Array.isArray(product.images)) {
      const primary = product.images.find((img: any) => img.isPrimary);
      if (primary) return primary.url;
      if (product.images[0]) return product.images[0].url || product.images[0];
    }
    if (typeof product.images === 'string') return product.images;
    if (product.image) return product.image;
    return '/placeholder.png';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        <button
          onClick={() => navigate('/admin/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          Add New Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="kids">Kids</option>
            <option value="sale">Sale</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="inStock">In Stock</option>
            <option value="outOfStock">Out of Stock</option>
            <option value="featured">Featured</option>
            <option value="trending">Trending</option>
          </select>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <LoadingSpinner size="xl" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first product</p>
            <button
              onClick={() => navigate('/admin/products/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Add Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Inventory</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Rating</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getPrimaryImage(product)}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.png';
                          }}
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            {product.featured && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Featured</span>
                            )}
                            {product.trending && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Trending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 capitalize">{product.category || '—'}</div>
                      {product.subcategory && (
                        <div className="text-xs text-gray-500">{product.subcategory}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-semibold text-gray-900">{formatPrice(product.price || 0)}</div>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <div className="text-xs text-gray-500 line-through">
                            {formatPrice(product.originalPrice)}
                          </div>
                        )}
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={product.price}
                          onBlur={(e) => {
                            const newPrice = parseFloat(e.target.value);
                            if (newPrice !== product.price && !isNaN(newPrice)) {
                              handleQuickEdit(product._id, 'price', newPrice);
                            }
                          }}
                          className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Price"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className={`text-sm font-medium ${product.inventory > 10 ? 'text-green-600' : product.inventory > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {product.inventory || 0} units
                        </div>
                        <input
                          type="number"
                          defaultValue={product.inventory || 0}
                          onBlur={(e) => {
                            const newInventory = parseInt(e.target.value);
                            if (newInventory !== product.inventory && !isNaN(newInventory)) {
                              handleQuickEdit(product._id, 'inventory', newInventory);
                            }
                          }}
                          className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Qty"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={product.inStock ?? false}
                            onChange={(e) => handleQuickEdit(product._id, 'inStock', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`text-xs font-medium ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                            {product.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={product.featured ?? false}
                              onChange={(e) => handleQuickEdit(product._id, 'featured', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-600">Featured</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={product.trending ?? false}
                              onChange={(e) => handleQuickEdit(product._id, 'trending', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-600">Trending</span>
                          </label>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {product.ratings?.average?.toFixed(1) || product.rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({product.ratings?.count || product.reviewCount || 0})
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        defaultValue={product.ratings?.average || product.rating || 0}
                        onBlur={(e) => {
                          const newRating = parseFloat(e.target.value);
                          if (!isNaN(newRating) && newRating >= 0 && newRating <= 5) {
                            handleQuickEdit(product._id, 'ratings', {
                              average: newRating,
                              count: product.ratings?.count || 0,
                            });
                          }
                        }}
                        className="w-20 mt-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        placeholder="Rating"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
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
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} products
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => load(page - 1, search, categoryFilter, statusFilter)}
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
                    onClick={() => load(pageNum, search, categoryFilter, statusFilter)}
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
              onClick={() => load(page + 1, search, categoryFilter, statusFilter)}
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
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Product</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
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
    </div>
  );
};

export default AdminProducts;
