import React, { useEffect, useState, useCallback } from 'react';
import { filtersAPI } from '../../api';
import {
  Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronRight,
  GripVertical, Palette, Tag, Layers, Settings, Search
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface FilterOption {
  _id: string;
  value: string;
  slug: string;
  label: string;
  displayOrder: number;
  isEnabled: boolean;
  meta?: Record<string, any>;
}

interface FilterGroup {
  _id: string;
  name: string;
  slug: string;
  type: string;
  displayOrder: number;
  isGlobal: boolean;
  icon?: string;
  description?: string;
  options: FilterOption[];
}

interface CategoryFilterConfig {
  _id: string;
  categorySlug: string;
  gender: string;
  productType: string;
  isEnabled: boolean;
  filterGroups: Array<{ filterGroup: any; displayOrder: number; isRequired: boolean }>;
}

// ──────────────────────────────────────────────
// Tabs
// ──────────────────────────────────────────────
type Tab = 'groups' | 'configs';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'groups', label: 'Filter Groups & Options', icon: <Layers size={16} /> },
  { key: 'configs', label: 'Category Assignments', icon: <Settings size={16} /> },
];

const GROUP_TYPES = [
  { value: 'multi-select', label: 'Multi-Select' },
  { value: 'single-select', label: 'Single-Select' },
  { value: 'range', label: 'Range Slider' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
  { value: 'color-swatch', label: 'Color Swatch' },
];

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
const AdminFilters: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('groups');
  const [groups, setGroups] = useState<FilterGroup[]>([]);
  const [configs, setConfigs] = useState<CategoryFilterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gRes, cRes]: any[] = await Promise.all([
        filtersAPI.getGroups(),
        filtersAPI.getConfigs(),
      ]);
      const gData = gRes?.data || gRes || [];
      const cData = cRes?.data || cRes || [];
      setGroups(Array.isArray(gData) ? gData : []);
      setConfigs(Array.isArray(cData) ? cData : []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Filter Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage dynamic product filters. Changes apply to the storefront immediately.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading filter data...</div>
      ) : (
        <>
          {activeTab === 'groups' && (
            <FilterGroupsTab groups={groups} onRefresh={load} />
          )}
          {activeTab === 'configs' && (
            <CategoryConfigsTab configs={configs} groups={groups} onRefresh={load} />
          )}
        </>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Tab: Filter Groups & Options
// ──────────────────────────────────────────────
const FilterGroupsTab: React.FC<{ groups: FilterGroup[]; onRefresh: () => void }> = ({ groups, onRefresh }) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FilterGroup | null>(null);
  const [showAddOption, setShowAddOption] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.slug.toLowerCase().includes(search.toLowerCase())
  );

  // ── Create / Update Group ──
  const handleSaveGroup = async (data: Partial<FilterGroup>, isNew: boolean) => {
    setSaving(true);
    try {
      if (isNew) {
        await filtersAPI.createGroup(data);
      } else {
        await filtersAPI.updateGroup(data._id!, data);
      }
      setShowCreateGroup(false);
      setEditingGroup(null);
      onRefresh();
    } catch (e: any) {
      alert('Error: ' + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Group ──
  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this filter group and all its options? This cannot be undone.')) return;
    try {
      await filtersAPI.deleteGroup(id);
      onRefresh();
    } catch (e: any) {
      alert('Error: ' + (e?.message || String(e)));
    }
  };

  // ── Add Option ──
  const handleAddOption = async (groupId: string, data: Partial<FilterOption>) => {
    setSaving(true);
    try {
      await filtersAPI.createOption(groupId, data);
      setShowAddOption(null);
      onRefresh();
    } catch (e: any) {
      alert('Error: ' + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Option ──
  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Delete this filter option?')) return;
    try {
      await filtersAPI.deleteOption(optionId);
      onRefresh();
    } catch (e: any) {
      alert('Error: ' + (e?.message || String(e)));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search filter groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button
          onClick={() => { setShowCreateGroup(true); setEditingGroup(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          New Filter Group
        </button>
      </div>

      {/* Create/Edit Group Modal */}
      {(showCreateGroup || editingGroup) && (
        <GroupFormModal
          group={editingGroup}
          saving={saving}
          onSave={(data) => handleSaveGroup(data, !editingGroup)}
          onCancel={() => { setShowCreateGroup(false); setEditingGroup(null); }}
        />
      )}

      {/* Groups List */}
      <div className="space-y-2">
        {filtered.map((group) => (
          <div key={group._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => setExpandedGroup(expandedGroup === group._id ? null : group._id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedGroup === group._id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div className="text-left">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {group.name}
                    {group.isGlobal && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        GLOBAL
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    slug: <code className="bg-gray-100 px-1 rounded">{group.slug}</code> · type: {group.type} · {(group.options || []).length} options
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setEditingGroup(group)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                  title="Edit group"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteGroup(group._id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                  title="Delete group"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </button>

            {/* Expanded: Options List */}
            {expandedGroup === group._id && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Options</h4>
                  <button
                    onClick={() => setShowAddOption(group._id)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Plus size={12} />
                    Add Option
                  </button>
                </div>

                {showAddOption === group._id && (
                  <OptionFormInline
                    groupType={group.type}
                    saving={saving}
                    onSave={(data) => handleAddOption(group._id, data)}
                    onCancel={() => setShowAddOption(null)}
                  />
                )}

                {(group.options || []).length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No options yet.</p>
                ) : (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {(group.options || [])
                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                      .map((opt) => (
                        <div
                          key={opt._id}
                          className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100 group"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical size={14} className="text-gray-300" />
                            {opt.meta?.hex && (
                              <span
                                className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"
                                style={{ background: opt.meta.hex.startsWith('linear') ? opt.meta.hex : opt.meta.hex }}
                              />
                            )}
                            <span className="text-sm text-gray-800">{opt.label || opt.value}</span>
                            <code className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded">{opt.slug}</code>
                          </div>
                          <button
                            onClick={() => handleDeleteOption(opt._id)}
                            className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete option"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          {search ? 'No groups match your search.' : 'No filter groups yet. Create one to get started.'}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Group Form Modal
// ──────────────────────────────────────────────
const GroupFormModal: React.FC<{
  group: FilterGroup | null;
  saving: boolean;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ group, saving, onSave, onCancel }) => {
  const [form, setForm] = useState({
    _id: group?._id || '',
    name: group?.name || '',
    slug: group?.slug || '',
    type: group?.type || 'multi-select',
    isGlobal: group?.isGlobal || false,
    displayOrder: group?.displayOrder || 0,
    description: group?.description || '',
  });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">
            {group ? 'Edit Filter Group' : 'Create Filter Group'}
          </h3>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: group ? form.slug : autoSlug(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
              placeholder="e.g., Fabric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
              placeholder="auto-generated"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
              >
                {GROUP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
              placeholder="Optional description"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isGlobal}
              onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Global filter (shows on all categories)</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name || !form.slug}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving...' : group ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Inline Option Form
// ──────────────────────────────────────────────
const OptionFormInline: React.FC<{
  groupType: string;
  saving: boolean;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ groupType, saving, onSave, onCancel }) => {
  const [form, setForm] = useState({
    value: '',
    slug: '',
    label: '',
    hex: '',
  });

  const autoSlug = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-');

  return (
    <div className="flex flex-wrap items-end gap-2 mb-3 p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-[120px]">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Value</label>
        <input
          type="text"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value, slug: autoSlug(e.target.value), label: form.label || e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-gray-900 focus:outline-none"
          placeholder="e.g., Cotton"
        />
      </div>
      <div className="w-28">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Slug</label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Label</label>
        <input
          type="text"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-gray-900 focus:outline-none"
          placeholder="Display label"
        />
      </div>
      {groupType === 'color-swatch' && (
        <div className="w-24">
          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Hex Color</label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={form.hex || '#000000'}
              onChange={(e) => setForm({ ...form, hex: e.target.value })}
              className="w-8 h-8 border-0 rounded cursor-pointer"
            />
            <input
              type="text"
              value={form.hex}
              onChange={(e) => setForm({ ...form, hex: e.target.value })}
              className="flex-1 px-1 py-1.5 border border-gray-200 rounded text-xs focus:outline-none"
              placeholder="#000"
            />
          </div>
        </div>
      )}
      <div className="flex gap-1">
        <button
          onClick={() => {
            const meta: any = {};
            if (form.hex) meta.hex = form.hex;
            onSave({ value: form.value, slug: form.slug, label: form.label || form.value, meta });
          }}
          disabled={saving || !form.value || !form.slug}
          className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded hover:bg-gray-800 disabled:opacity-40"
        >
          {saving ? '...' : 'Add'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-gray-500 text-xs rounded hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Tab: Category Filter Configs
// ──────────────────────────────────────────────
const CategoryConfigsTab: React.FC<{
  configs: CategoryFilterConfig[];
  groups: FilterGroup[];
  onRefresh: () => void;
}> = ({ configs, groups, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CategoryFilterConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = configs.filter((c) =>
    !search ||
    c.categorySlug.toLowerCase().includes(search.toLowerCase()) ||
    c.gender.toLowerCase().includes(search.toLowerCase()) ||
    c.productType.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (categorySlug: string, data: any) => {
    setSaving(true);
    try {
      await filtersAPI.setConfig(categorySlug, data);
      setShowCreate(false);
      setEditing(null);
      onRefresh();
    } catch (e: any) {
      alert('Error: ' + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search category configs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          New Config
        </button>
      </div>

      {(showCreate || editing) && (
        <ConfigFormModal
          config={editing}
          groups={groups}
          saving={saving}
          onSave={handleSave}
          onCancel={() => { setShowCreate(false); setEditing(null); }}
        />
      )}

      {/* Config Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Category Slug</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Gender</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Product Type</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Assigned Filters</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((config) => {
                const assignedNames = (config.filterGroups || [])
                  .map((fg: any) => {
                    const g = typeof fg.filterGroup === 'object' ? fg.filterGroup : groups.find(gg => gg._id === fg.filterGroup);
                    return g?.name || '?';
                  })
                  .join(', ');

                return (
                  <tr key={config._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-medium">{config.categorySlug}</code>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{config.gender || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{config.productType}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate" title={assignedNames}>
                      {(config.filterGroups || []).length} filters
                      {assignedNames && <span className="text-gray-400 ml-1">({assignedNames})</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {config.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setEditing(config)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                        title="Edit config"
                      >
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            {search ? 'No configs match your search.' : 'No category filter configs yet.'}
          </div>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Config Form Modal
// ──────────────────────────────────────────────
const ConfigFormModal: React.FC<{
  config: CategoryFilterConfig | null;
  groups: FilterGroup[];
  saving: boolean;
  onSave: (categorySlug: string, data: any) => void;
  onCancel: () => void;
}> = ({ config, groups, saving, onSave, onCancel }) => {
  const [form, setForm] = useState({
    categorySlug: config?.categorySlug || '',
    gender: config?.gender || '',
    productType: config?.productType || 'clothing',
    isEnabled: config?.isEnabled ?? true,
    selectedGroupIds: (config?.filterGroups || []).map((fg: any) =>
      typeof fg.filterGroup === 'object' ? fg.filterGroup._id : fg.filterGroup
    ),
  });

  const nonGlobalGroups = groups.filter((g) => !g.isGlobal);

  const toggleGroup = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedGroupIds: prev.selectedGroupIds.includes(id)
        ? prev.selectedGroupIds.filter((gid) => gid !== id)
        : [...prev.selectedGroupIds, id],
    }));
  };

  const handleSubmit = () => {
    const filterGroups = form.selectedGroupIds.map((id, i) => ({
      filterGroup: id,
      displayOrder: i,
      isRequired: false,
    }));
    onSave(form.categorySlug, {
      gender: form.gender,
      productType: form.productType,
      isEnabled: form.isEnabled,
      filterGroups,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">
            {config ? `Edit Config: ${config.categorySlug}` : 'New Category Filter Config'}
          </h3>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Slug</label>
              <input
                type="text"
                value={form.categorySlug}
                onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
                disabled={!!config}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none disabled:bg-gray-50"
                placeholder="e.g., t-shirts"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
              >
                <option value="">All</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="kids">Kids</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
              <select
                value={form.productType}
                onChange={(e) => setForm({ ...form, productType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:outline-none"
              >
                <option value="clothing">Clothing</option>
                <option value="footwear">Footwear</option>
                <option value="accessories">Accessories</option>
                <option value="sportswear">Sportswear</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Assign Category-Specific Filters
              <span className="text-gray-400 font-normal ml-1">(Global filters are always included)</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {nonGlobalGroups.map((g) => (
                <label
                  key={g._id}
                  className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer transition-colors ${
                    form.selectedGroupIds.includes(g._id)
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.selectedGroupIds.includes(g._id)}
                    onChange={() => toggleGroup(g._id)}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{g.name}</div>
                    <div className="text-[10px] text-gray-400">{g.type} · {(g.options || []).length} opts</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.categorySlug}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving...' : config ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminFilters;
