import React, { useEffect, useState } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Calendar, 
  AlertCircle,
  Copy,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Percent,
  DollarSign
} from 'lucide-react';
import { api } from '../../api';
import { PromoCode } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatCurrency';

export const AdminPromoCodes: React.FC = () => {
  const { showToast } = useToast();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formState, setFormState] = useState<{
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountAmount: number | '';
    minOrderAmount: number | '';
    maxDiscountAmount: number | '';
    startDate: string;
    endDate: string;
    isActive: boolean;
    maxUses: number | '';
  }>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountAmount: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    startDate: '',
    endDate: '',
    isActive: true,
    maxUses: '',
  });

  const loadPromoCodes = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (filterStatus === 'active') params.isActive = true;
      if (filterStatus === 'inactive') params.isActive = false;
      
      const res = await api.admin.getPromoCodes(params);
      if (res && res.data && Array.isArray(res.data.promoCodes)) {
        setPromoCodes(res.data.promoCodes);
      } else {
        setPromoCodes([]);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to load promo codes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromoCodes();
  }, [filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPromoCodes();
  };

  const openCreateModal = () => {
    setEditingPromo(null);
    setFormState({
      code: '',
      description: '',
      discountType: 'percentage',
      discountAmount: '',
      minOrderAmount: '',
      maxDiscountAmount: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true,
      maxUses: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormState({
      code: promo.code,
      description: promo.description || '',
      discountType: promo.discountType,
      discountAmount: promo.discountAmount,
      minOrderAmount: promo.minOrderAmount != null ? promo.minOrderAmount : '',
      maxDiscountAmount: promo.maxDiscountAmount != null ? promo.maxDiscountAmount : '',
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '',
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '',
      isActive: promo.isActive,
      maxUses: promo.maxUses != null ? promo.maxUses : '',
    });
    setModalOpen(true);
  };

  const handleToggleActive = async (promo: PromoCode) => {
    try {
      const res = await api.admin.togglePromoCode(promo._id);
      if (res && res.data && res.data.promoCode) {
        showToast(`Promo code ${promo.code} is now ${res.data.promoCode.isActive ? 'Active' : 'Disabled'}`, 'success');
        loadPromoCodes();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to toggle promo code', 'error');
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.code.trim()) {
      showToast('Promo code name is required', 'warning');
      return;
    }
    if (!formState.discountAmount || Number(formState.discountAmount) <= 0) {
      showToast('Please enter a valid discount amount', 'warning');
      return;
    }
    if (formState.discountType === 'percentage' && Number(formState.discountAmount) > 100) {
      showToast('Percentage discount cannot exceed 100%', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        code: formState.code.trim().toUpperCase(),
        description: formState.description.trim(),
        discountType: formState.discountType,
        discountAmount: Number(formState.discountAmount),
        minOrderAmount: formState.minOrderAmount !== '' ? Number(formState.minOrderAmount) : 0,
        maxDiscountAmount: formState.maxDiscountAmount !== '' ? Number(formState.maxDiscountAmount) : null,
        startDate: formState.startDate ? new Date(formState.startDate).toISOString() : null,
        endDate: formState.endDate ? new Date(formState.endDate).toISOString() : null,
        isActive: formState.isActive,
        maxUses: formState.maxUses !== '' ? Number(formState.maxUses) : null,
      };

      if (editingPromo) {
        await api.admin.updatePromoCode(editingPromo._id, payload);
        showToast(`Promo code ${payload.code} updated`, 'success');
      } else {
        await api.admin.createPromoCode(payload);
        showToast(`Promo code ${payload.code} created`, 'success');
      }

      setModalOpen(false);
      loadPromoCodes();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save promo code', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePromo = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.admin.deletePromoCode(deleteTarget._id);
      showToast(`Promo code ${deleteTarget.code} deleted`, 'success');
      setDeleteTarget(null);
      loadPromoCodes();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete promo code', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    showToast(`Copied "${text}" to clipboard!`, 'info');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-blue-600" />
            <span>Promotional Codes</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, manage, and track promo codes, validity dates, and usage limits.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Promo Code</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold self-start md:self-auto">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'inactive' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Promo Codes Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading promo codes...</p>
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 text-base mb-1">No promotional codes found</h3>
            <p className="text-sm text-gray-500 mb-4">Create your first promotional campaign to offer discounts to customers.</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Create Promo Code
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">Min. Spend</th>
                  <th className="py-3.5 px-4">Usage</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {promoCodes.map((promo) => {
                  const isExpired = promo.endDate && new Date(promo.endDate) < new Date();
                  const isExhausted = promo.maxUses != null && promo.usedCount >= promo.maxUses;

                  return (
                    <tr key={promo._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                            {promo.code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(promo.code)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            title="Copy code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {promo.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">{promo.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900 flex items-center gap-1.5">
                          {promo.discountType === 'percentage' ? (
                            <>
                              <span className="text-emerald-600 font-bold">{promo.discountAmount}% OFF</span>
                              {promo.maxDiscountAmount && (
                                <span className="text-xs text-gray-500">(Up to {formatCurrency(promo.maxDiscountAmount)})</span>
                              )}
                            </>
                          ) : (
                            <span className="text-blue-600 font-bold">{formatCurrency(promo.discountAmount)} OFF</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {promo.minOrderAmount && promo.minOrderAmount > 0 ? (
                          formatCurrency(promo.minOrderAmount)
                        ) : (
                          <span className="text-gray-400 text-xs">No minimum</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-900 font-medium">
                          {promo.usedCount || 0}
                          <span className="text-gray-400 font-normal text-xs ml-1">
                            / {promo.maxUses != null ? promo.maxUses : '∞'}
                          </span>
                        </div>
                        {isExhausted && (
                          <span className="text-[11px] text-red-600 font-semibold">Limit reached</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500">
                        {promo.endDate ? (
                          <div className={isExpired ? 'text-rose-600 font-medium' : ''}>
                            Until {new Date(promo.endDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-400">No expiration</span>
                        )}
                        {promo.startDate && (
                          <div className="text-[11px] text-gray-400">
                            From {new Date(promo.startDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Expired
                          </span>
                        ) : isExhausted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            Exhausted
                          </span>
                        ) : promo.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(promo)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title={promo.isActive ? 'Disable promo code' : 'Enable promo code'}
                          >
                            {promo.isActive ? (
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(promo)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(promo)}
                            className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Delete"
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
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                <span>{editingPromo ? 'Edit Promotional Code' : 'Create Promotional Code'}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Code Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER20"
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value.toUpperCase() })}
                    className="w-full text-sm font-mono uppercase px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={formState.discountType}
                    onChange={(e) => setFormState({ ...formState, discountType: e.target.value as any })}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="percentage">Percentage (% Off)</option>
                    <option value="fixed">Fixed Amount (Rs Off)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Discount Value * {formState.discountType === 'percentage' ? '(%)' : '(Rs)'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={formState.discountType === 'percentage' ? 100 : undefined}
                  required
                  placeholder={formState.discountType === 'percentage' ? 'e.g. 15' : 'e.g. 500'}
                  value={formState.discountAmount}
                  onChange={(e) => setFormState({ ...formState, discountAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Min Order Spend (Rs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for no minimum"
                    value={formState.minOrderAmount}
                    onChange={(e) => setFormState({ ...formState, minOrderAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Max Discount Limit (Rs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional ceiling cap"
                    disabled={formState.discountType === 'fixed'}
                    value={formState.maxDiscountAmount}
                    onChange={(e) => setFormState({ ...formState, maxDiscountAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formState.startDate}
                    onChange={(e) => setFormState({ ...formState, startDate: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    End Date (Expiration)
                  </label>
                  <input
                    type="date"
                    value={formState.endDate}
                    onChange={(e) => setFormState({ ...formState, endDate: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Max Total Redemptions
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited"
                  value={formState.maxUses}
                  onChange={(e) => setFormState({ ...formState, maxUses: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Internal Description / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eid sale 2026 campaign"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="promoIsActive"
                  checked={formState.isActive}
                  onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="promoIsActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Activate promo code immediately
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingPromo ? 'Update Promo Code' : 'Create Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Promo Code</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to delete promo code <span className="font-mono font-bold text-gray-800">{deleteTarget.code}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeletePromo}
                className="flex-1 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromoCodes;
