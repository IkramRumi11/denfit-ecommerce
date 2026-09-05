import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Search, Plus, Edit, Trash2, Package, Star, AlertCircle, X } from 'lucide-react';
import { generateProducts } from '../../utils/generateProducts';

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
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [editingStockProduct, setEditingStockProduct] = useState<any | null>(null);

  // Track most recent request to avoid applying out-of-order responses
  const latestRequestRef = useRef(0);

  const load = useCallback(async (p = 1, q = '', category = '', status = '') => {
    const reqId = ++latestRequestRef.current;
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
      // Only apply results for the latest request to avoid race-updates/flicker
      if (reqId !== latestRequestRef.current) return;
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

  

  const seedSampleProducts = async (count = 10) => {
    if (!confirm(`Create ${count} sample products? This will insert them into the database.`)) return;
    setLoading(true);
    try {
      const generated = generateProducts(count).map((p) => {
        // Convert to API shape expected
        return {
          name: p.name,
          description: p.description,
          price: p.price,
          originalPrice: p.originalPrice,
          category: p.category,
          subcategory: p.subcategory,
          images: (p.images || []).map((img, idx) => ({ url: typeof img === 'string' ? img : (img as any).url, isPrimary: idx === 0, order: idx })),
          sizes: p.sizes || [],
          colors: p.colors || [],
          tags: p.tags || [],
          specifications: p.specifications || {},
          ratings: p.ratings || { average: 0, count: 0 },
          inventory: p.inventory || 10,
          inStock: true,
          // Default seeded products to DRAFT so they don't appear publicly until the admin publishes them
          status: 'draft',
          featured: p.featured || false,
          trending: p.trending || false,
          seo: p.seo || { slug: p.seo?.slug || undefined }
        };
      });

      for (const product of generated) {
        await api.admin.createProduct(product);
      }
      showToast(`Seeded ${count} products`, 'success');
      load(page, search, categoryFilter, statusFilter);
    } catch (e: any) {
      showToast(e?.message || 'Failed to seed products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, search, categoryFilter, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter, statusFilter]);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectAll = () => {
    const all = products.reduce((acc, p) => ({ ...acc, [p._id]: true }), {} as Record<string, boolean>);
    setSelectedIds(all);
  };

  const clearSelection = () => setSelectedIds({});

  const getSelectedIds = () => Object.keys(selectedIds).filter((id) => selectedIds[id]);

  const bulkUpdate = async (updateData: any) => {
    const ids = getSelectedIds();
    if (ids.length === 0) return showToast('No products selected', 'warning');
    try {
      const res = await api.admin.bulkUpdateProducts(ids, updateData);
      showToast(res?.message || `${ids.length} products updated`, 'success');
      load(page, search, categoryFilter, statusFilter);
      clearSelection();
    } catch (e: any) {
      showToast(e?.message || 'Bulk update failed', 'error');
    }
  };

  const bulkDelete = async () => {
    const ids = getSelectedIds();
    if (ids.length === 0) return showToast('No products selected', 'warning');
    try {
      const res = await api.admin.bulkDeleteProducts(ids);
      showToast(res?.message || `${ids.length} products deleted`, 'success');
      load(page, search, categoryFilter, statusFilter);
      clearSelection();
    } catch (e: any) {
      showToast(e?.message || 'Bulk delete failed', 'error');
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

  const displayAvailableQuantity = (product: any) => {
    if (product && typeof product.availableQuantity === 'number') return product.availableQuantity;
    if (product && typeof product.inventory === 'number') return product.inventory;
    if (product && Array.isArray(product.sizes)) return product.sizes.reduce((a: number, b: any) => a + (Number(b?.quantity) || 0), 0);
    if (product && Array.isArray(product.stock)) return product.stock.reduce((a: number, b: any) => a + (Number(b?.quantity) || 0), 0);
    return 0;
  };

  const isOutOfStockFlag = (product: any) => {
    if (product && typeof product.isOutOfStock === 'boolean') return product.isOutOfStock;
    if (product && typeof product.inStock === 'boolean') return !product.inStock;
    return displayAvailableQuantity(product) <= 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/admin/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          Add New Product
        </button>
        <button
          onClick={() => seedSampleProducts(10)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all font-medium text-sm"
        >
          Seed 10 products
        </button>
        </div>
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
            <option value="fragrances">Fragrances</option>
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
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => bulkUpdate({ featured: true })}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Feature selected
          </button>
          <button
            onClick={() => bulkUpdate({ featured: false })}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Unfeature selected
          </button>
          <button
            onClick={() => bulkUpdate({ inStock: true })}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Mark In Stock
          </button>
          <button
            onClick={() => bulkUpdate({ inStock: false })}
            className="px-3 py-1 bg-yellow-400 text-white rounded"
          >
            Mark Out of Stock
          </button>
          <button
            onClick={() => {
              if (confirm('Delete selected products? This cannot be undone.')) bulkDelete();
            }}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Delete selected
          </button>
          <button
            onClick={() => bulkUpdate({ status: 'published' })}
            className="px-3 py-1 bg-indigo-600 text-white rounded"
          >
            Publish selected
          </button>
          <button
            onClick={() => bulkUpdate({ status: 'draft' })}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Unpublish selected
          </button>
        </div>
      </div>
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <input
                      type="checkbox"
                      onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                      checked={getSelectedIds().length === products.length && products.length > 0}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Slug</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tags</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Inventory</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Sizes</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Colors</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Publication</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Rating</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={!!selectedIds[product._id]} onChange={() => toggleSelect(product._id)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getPrimaryImage(product)}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                          onError={(e) => {(e.target as HTMLImageElement).src = '/placeholder.png';}}
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            {product.featured && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Featured</span>}
                            {product.trending && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Trending</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{product.sku || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{product.seo?.slug || product.slug || product._id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 capitalize">{product.category || '—'}</div>
                      {product.subcategory && <div className="text-xs text-gray-500">{product.subcategory}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{(product.tags || []).slice(0,3).join(', ')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-semibold text-gray-900">{formatPrice(product.price || 0)}</div>
                        {product.originalPrice && product.originalPrice > product.price && (<div className="text-xs text-gray-500 line-through">{formatPrice(product.originalPrice)}</div>)}
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={product.price}
                          onBlur={(e) => {
                            const newPrice = parseFloat(e.target.value);
                            if (newPrice !== product.price && !isNaN(newPrice)) { handleQuickEdit(product._id, 'price', newPrice); }
                          }}
                          className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Price"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {(() => {
                          const avail = displayAvailableQuantity(product);
                          return (
                            <button
                              type="button"
                              onClick={() => setEditingStockProduct(JSON.parse(JSON.stringify(product)))}
                              className={`text-sm font-semibold hover:underline flex items-center gap-1.5 ${
                                avail > 10 ? 'text-green-600' : avail > 0 ? 'text-yellow-600' : 'text-red-600'
                              }`}
                              title="Click to manage detailed stock matrix"
                            >
                              <span>{avail} units</span>
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded font-normal hover:bg-gray-200">
                                Edit Qty
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{(product.sizes || []).length}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{(product.colors || []).length}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          {(() => {
                            const outFlag = isOutOfStockFlag(product);
                            return (
                              <>
                                <input
                                  type="checkbox"
                                  checked={!outFlag}
                                  onChange={(e) => handleQuickEdit(product._id, 'inStock', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`text-xs font-medium ${!outFlag ? 'text-green-600' : 'text-red-600'}`}>
                                  {!outFlag ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </>
                            );
                          })()}
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
                      <div className="text-sm">{product.status || 'published'}</div>
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
                          onClick={() => handleQuickEdit(product._id, 'status', product.status === 'published' ? 'draft' : 'published')}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title={product.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {product.status === 'published' ? 'Unpublish' : 'Publish'}
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

      {/* Variant Inventory Editor Modal */}
      {editingStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Manage Variant Inventory
              </h3>
              <button onClick={() => setEditingStockProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-2.5 rounded">
              <span className="font-semibold text-gray-700">Product:</span> {editingStockProduct.name}
            </div>

            <div className="flex-1 overflow-y-auto mb-6 pr-1">
              {(() => {
                const hasColors = Array.isArray(editingStockProduct.colors) && editingStockProduct.colors.length > 0;
                const hasSizes = Array.isArray(editingStockProduct.sizes) && editingStockProduct.sizes.length > 0;

                if (hasColors && hasSizes) {
                  return (
                    <div className="space-y-5">
                      {(editingStockProduct.colors || []).map((col: any, cIdx: number) => {
                        const colId = col.tempId || col.name || col.hex || col.value;
                        return (
                          <div key={colId || cIdx} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                            <h4 className="font-semibold text-sm text-gray-800 flex items-center gap-2 mb-3">
                              {col.hex && (
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-gray-200 inline-block align-middle"
                                  style={{ backgroundColor: col.hex }}
                                />
                              )}
                              {col.name || col.hex || 'Color Variant'}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {(editingStockProduct.sizes || []).map((sz: any) => {
                                const sizeId = sz.id || sz._id;
                                const stIdx = (editingStockProduct.stock || []).findIndex(
                                  (s: any) => String(s.colorTempId) === String(colId) && String(s.sizeId) === String(sizeId)
                                );
                                const qty = stIdx >= 0 ? editingStockProduct.stock[stIdx].quantity : 0;
                                return (
                                  <div key={sizeId} className="flex flex-col gap-1 bg-white p-2 rounded border border-gray-200">
                                    <span className="text-[10px] text-gray-400 font-semibold uppercase">{sz.value}</span>
                                    <input
                                      type="number"
                                      value={qty}
                                      min="0"
                                      onChange={(e) => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setEditingStockProduct((prev: any) => {
                                          const stock = Array.isArray(prev.stock) ? [...prev.stock] : [];
                                          const match = stock.findIndex(
                                            (s: any) => String(s.colorTempId) === String(colId) && String(s.sizeId) === String(sizeId)
                                          );
                                          if (match >= 0) {
                                            stock[match] = { ...stock[match], quantity: val };
                                          } else {
                                            stock.push({ colorTempId: colId, sizeId, quantity: val });
                                          }
                                          return { ...prev, stock };
                                        });
                                      }}
                                      className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                if (hasSizes) {
                  return (
                    <div className="space-y-3 bg-gray-50 border border-gray-100 rounded-lg p-4">
                      <h4 className="font-semibold text-sm text-gray-800 mb-2">Sizes Stock Mapping</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(editingStockProduct.sizes || []).map((sz: any, idx: number) => (
                          <div key={sz.id || idx} className="flex flex-col gap-1 bg-white p-2 rounded border border-gray-200">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase">{sz.value}</span>
                            <input
                              type="number"
                              value={sz.quantity ?? 0}
                              min="0"
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setEditingStockProduct((prev: any) => {
                                  const sizes = [...prev.sizes];
                                  sizes[idx] = { ...sizes[idx], quantity: val, inStock: val > 0 };
                                  return { ...prev, sizes };
                                });
                              }}
                              className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-gray-800">Direct Stock Input</h4>
                    <div className="flex flex-col gap-1.5 w-48 bg-white p-3 rounded border border-gray-200">
                      <span className="text-xs text-gray-400 font-semibold uppercase">Quantity</span>
                      <input
                        type="number"
                        value={editingStockProduct.inventory ?? 0}
                        min="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setEditingStockProduct((prev: any) => ({ ...prev, inventory: val }));
                        }}
                        className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm font-semibold text-gray-700">
                Derived Total Stock: <span className="text-blue-600 font-bold text-lg">{(() => {
                  const hasStock = Array.isArray(editingStockProduct.stock) && editingStockProduct.stock.length > 0;
                  const hasSizes = Array.isArray(editingStockProduct.sizes) && editingStockProduct.sizes.length > 0;
                  if (hasStock) {
                    return editingStockProduct.stock.reduce((sum: number, item: any) => sum + (Number(item?.quantity) || 0), 0);
                  } else if (hasSizes) {
                    return editingStockProduct.sizes.reduce((sum: number, item: any) => sum + (Number(item?.quantity) || 0), 0);
                  }
                  return Number(editingStockProduct.inventory) || 0;
                })()} units</span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStockProduct(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const payload: any = {};
                      const hasStock = Array.isArray(editingStockProduct.stock) && editingStockProduct.stock.length > 0;
                      const hasSizes = Array.isArray(editingStockProduct.sizes) && editingStockProduct.sizes.length > 0;

                      if (hasStock) {
                        payload.stock = editingStockProduct.stock;
                      } else if (hasSizes) {
                        payload.sizes = editingStockProduct.sizes;
                      } else {
                        payload.inventory = editingStockProduct.inventory;
                      }

                      await api.admin.updateProduct(editingStockProduct._id, payload);
                      showToast('Inventory updated successfully', 'success');
                      setEditingStockProduct(null);
                      load(page, search, categoryFilter, statusFilter);
                    } catch (e: any) {
                      console.error(e);
                      showToast(e?.message || 'Failed to update stock', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
                >
                  Save Stock Matrix
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
