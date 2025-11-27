import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useFeatures } from '../../context/FeatureContext';

const AdminFeatures: React.FC = () => {
  const { showToast } = useToast();
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFlag, setNewFlag] = useState({ name: 'RAPTOR_MINI', enabled: true, target: 'global', envName: '', userId: '' });
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    if (!userSearch) return;
    const timer = setTimeout(async () => {
      try {
        const res: any = await api.admin.getAllUsers({ search: userSearch, limit: 10 });
        if (!active) return;
        setUserResults(res?.data?.users || []);
      } catch (e) { setUserResults([]); }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [userSearch]);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.admin.getFeatureFlags();
      setFlags(res?.data?.flags || []);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load flags', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { refresh } = useFeatures();
  useEffect(() => { load(); }, []);

  const createFlag = async () => {
    try {
      const payload = { ...newFlag };
      if (!payload.name) return showToast('Flag name is required', 'warning');
      const res: any = await api.admin.createFeatureFlag(payload);
      showToast('Flag created/updated', 'success');
      setNewFlag({ name: 'RAPTOR_MINI', enabled: true, target: 'global', envName: '', userId: '' });
      load();
      // notify UI to refetch flags and use refresh for direct update
      try { refresh(); } catch {}
      window.dispatchEvent(new CustomEvent('features:changed'));
    } catch (e: any) { showToast(e?.message || 'Failed to create flag', 'error'); }
  };

  const toggleFlag = async (flag: any) => {
    try {
      const res: any = await api.admin.updateFeatureFlag(flag._id, { enabled: !flag.enabled });
      showToast('Flag updated', 'success');
      load();
      try { refresh(); } catch {}
      window.dispatchEvent(new CustomEvent('features:changed'));
    } catch (e: any) { showToast(e?.message || 'Failed to update', 'error'); }
  };

  const removeFlag = async (flag: any) => {
    if (!confirm('Delete feature flag?')) return;
    try {
      await api.admin.deleteFeatureFlag(flag._id);
      showToast('Flag removed', 'success');
      load();
      try { refresh(); } catch {}
      window.dispatchEvent(new CustomEvent('features:changed'));
    } catch (e: any) { showToast(e?.message || 'Failed to delete', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-gray-600 mt-1">Manage runtime feature flags</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="border p-2" value={newFlag.name} onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })} placeholder="Flag name (e.g., RAPTOR_MINI)" />
          <select value={newFlag.target} onChange={(e) => setNewFlag({ ...newFlag, target: e.target.value })} className="border p-2">
            <option value="global">Global</option>
            <option value="environment">Environment</option>
            <option value="user">User</option>
          </select>
          <div className="flex gap-2">
            <input className="border p-2" placeholder="envName (e.g. production)" value={newFlag.envName} onChange={(e) => setNewFlag({ ...newFlag, envName: e.target.value })} />
            <div className="relative">
              <input className="border p-2" placeholder="search user" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              {userResults.length > 0 && (
                <div className="absolute bg-white shadow rounded mt-1 z-20 max-h-64 overflow-auto w-full">
                  {userResults.map(u => (
                    <div key={u._id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setNewFlag({ ...newFlag, userId: u._id }); setUserSearch(u.name); setUserResults([]); }}>
                      {u.name} — {u.email}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => createFlag()} className="px-4 py-2 bg-blue-600 text-white rounded">Create / Update</button>
          <label className="flex items-center gap-2"><input type="checkbox" checked={newFlag.enabled} onChange={(e) => setNewFlag({ ...newFlag, enabled: e.target.checked })} /> Enabled</label>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-sm">
        {loading ? (<div>Loading...</div>) : (
          <table className="w-full table-auto">
            <thead>
              <tr><th className="p-2">Name</th><th className="p-2">Target</th><th className="p-2">Env/User</th><th className="p-2">Enabled</th><th className="p-2">Actions</th></tr>
            </thead>
            <tbody>
              {flags.map(f => (
                <tr key={f._id} className="border-t">
                  <td className="p-2">{f.name}</td>
                  <td className="p-2">{f.target}</td>
                  <td className="p-2">{f.envName || f.userId || '—'}</td>
                  <td className="p-2">{f.enabled ? 'Yes' : 'No'}</td>
                  <td className="p-2 flex gap-2">
                    <button className="px-2 py-1 bg-yellow-200" onClick={() => toggleFlag(f)}>{f.enabled ? 'Disable' : 'Enable'}</button>
                    <button className="px-2 py-1 bg-red-200" onClick={() => removeFlag(f)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminFeatures;
