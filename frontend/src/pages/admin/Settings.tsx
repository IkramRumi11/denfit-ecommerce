import React, { useEffect, useState, useRef } from 'react';

type Setting = {
  _id: string;
  key: string;
  value: any;
  type: 'string'|'number'|'boolean'|'json';
  description?: string;
  enabled?: boolean;
};

function getXSRF() {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState<'string'|'number'|'boolean'|'json'>('string');
  const [newValue, setNewValue] = useState('');
  const esRef = useRef<EventSource | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const r = await fetch('/api/v1/admin/settings', { credentials: 'include' });
    const j = await r.json();
    if (j && j.data && j.data.settings) setSettings(j.data.settings);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
    // SSE
    try {
      const es = new EventSource('/api/v1/admin/settings/stream');
      es.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d && d.payload) {
            const { action, setting } = d.payload;
            if (action === 'create') setSettings((s) => [setting, ...s]);
            if (action === 'update') setSettings((s) => s.map(x => x._id === setting._id ? setting : x));
            if (action === 'delete') setSettings((s) => s.filter(x => x._id !== setting._id));
          }
        } catch (e) {}
      };
      esRef.current = es;
    } catch (e) {}
    return () => { if (esRef.current) esRef.current.close(); };
  }, []);

  const importFeatureFlags = async () => {
    const xs = getXSRF();
    const r = await fetch('/api/v1/admin/settings/import/flags', { method: 'POST', credentials: 'include', headers: { 'x-xsrf-token': xs } });
    const j = await r.json();
    if (j && j.success) { alert(j.message || 'Imported flags'); fetchSettings(); }
  };

  const importSizeProfiles = async () => {
    const xs = getXSRF();
    const r = await fetch('/api/v1/admin/settings/import/size-profiles', { method: 'POST', credentials: 'include', headers: { 'x-xsrf-token': xs } });
    const j = await r.json();
    if (j && j.success) { alert(j.message || 'Imported size profiles'); fetchSettings(); }
  };

  const exportAll = async () => {
    const r = await fetch('/api/v1/admin/settings/aggregate', { credentials: 'include' });
    const j = await r.json();
    if (j && j.data) {
      const blob = new Blob([JSON.stringify(j.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'admin-aggregate.json'; a.click(); URL.revokeObjectURL(url);
    }
  };

  const saveSetting = async (id: string, update: Partial<Setting>) => {
    const xs = getXSRF();
    const r = await fetch(`/api/v1/admin/settings/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-xsrf-token': xs }, body: JSON.stringify(update) });
    const j = await r.json();
    if (j && j.data && j.data.setting) setSettings((s) => s.map(x => x._id === id ? j.data.setting : x));
  };

  const createNew = async () => {
    if (!newKey) return alert('Key required');
    let parsedValue: any = newValue;
    if (newType === 'number') parsedValue = Number(newValue);
    if (newType === 'boolean') parsedValue = newValue === 'true' || newValue === '1';
    if (newType === 'json') {
      try { parsedValue = JSON.parse(newValue); } catch (e) { return alert('Invalid JSON'); }
    }
    const xs = getXSRF();
    const r = await fetch('/api/v1/admin/settings', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-xsrf-token': xs }, body: JSON.stringify({ key: newKey, value: parsedValue, type: newType }) });
    const j = await r.json();
    if (j && j.data && j.data.setting) { setSettings((s) => [j.data.setting, ...s]); setNewKey(''); setNewValue(''); }
  };

  const deleteSetting = async (id: string) => {
    if (!confirm('Delete setting?')) return;
    const xs = getXSRF();
    const r = await fetch(`/api/v1/admin/settings/${id}`, { method: 'DELETE', credentials: 'include', headers: { 'x-xsrf-token': xs } });
    const j = await r.json();
    if (j && j.success) setSettings((s) => s.filter(x => x._id !== id));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Settings</h1>
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="font-semibold mb-2">Create new setting</h2>
        <div className="flex gap-2">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="key" className="border p-2 rounded" />
          <select value={newType} onChange={e => setNewType(e.target.value as any)} className="border p-2 rounded">
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="json">json</option>
          </select>
          <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="value" className="border p-2 rounded flex-1" />
          <button onClick={createNew} className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
          <button onClick={importFeatureFlags} className="bg-green-600 text-white px-4 py-2 rounded">Import Feature Flags</button>
          <button onClick={importSizeProfiles} className="bg-amber-600 text-white px-4 py-2 rounded">Import Size Profiles</button>
          <button onClick={exportAll} className="bg-gray-600 text-white px-4 py-2 rounded">Export All</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-semibold">Existing settings</h2>
        {loading ? <div>Loading...</div> : (
          <table className="w-full mt-3 table-auto">
            <thead><tr><th className="text-left">Key</th><th>Value</th><th>Type</th><th>Enabled</th><th>Actions</th></tr></thead>
            <tbody>
              {settings.map(s => (
                <tr key={s._id} className="border-t">
                  <td className="py-2">{s.key}<div className="text-xs text-gray-500">{s.description}</div></td>
                  <td>
                    {s.type === 'boolean' ? (
                      <input type="checkbox" checked={!!s.value} onChange={e => saveSetting(s._id, { value: e.target.checked })} />
                    ) : s.type === 'json' ? (
                      <textarea defaultValue={JSON.stringify(s.value)} onBlur={e => { try { saveSetting(s._id, { value: JSON.parse(e.target.value) }); } catch (err) { alert('Invalid JSON'); } }} className="border p-1 w-64 h-24" />
                    ) : (
                      <input defaultValue={String(s.value ?? '')} onBlur={e => saveSetting(s._id, { value: s.type === 'number' ? Number(e.target.value) : e.target.value })} className="border p-1" />
                    )}
                  </td>
                  <td className="text-center">{s.type}</td>
                  <td className="text-center"><input type="checkbox" checked={!!s.enabled} onChange={e => saveSetting(s._id, { enabled: e.target.checked })} /></td>
                  <td className="text-center">
                    <button className="text-red-600" onClick={() => deleteSetting(s._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
