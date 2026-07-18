import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import EmailMarketingCreate from './EmailMarketingCreate';
import EmailMarketingHistory from './EmailMarketingHistory';

const EmailMarketingSubscribers: React.FC = () => {
  const [tab, setTab] = useState<'subscribers'|'create'|'history'>('subscribers');
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const params: any = { page: 1, limit: 200 };
    if (q) params.q = q;
    if (filter === 'customers') params.source = 'customer';
    if (filter === 'newsletter') params.source = 'newsletter';
    if (filter === 'verified') params.verified = true;
    if (filter === 'active') params.status = 'active';
    const res = await adminAPI.getSubscribers(params);
    if (res && res.data) setItems(res.data.items || []);
  };

  useEffect(() => { load(); }, [q, filter]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Email Marketing</h2>
        <div className="flex gap-2">
          <button className={`px-3 py-1 rounded ${tab==='subscribers' ? 'bg-gray-800 text-white' : 'bg-white border'}`} onClick={() => setTab('subscribers')}>Subscribers</button>
          <button className={`px-3 py-1 rounded ${tab==='create' ? 'bg-gray-800 text-white' : 'bg-white border'}`} onClick={() => setTab('create')}>Create</button>
          <button className={`px-3 py-1 rounded ${tab==='history' ? 'bg-gray-800 text-white' : 'bg-white border'}`} onClick={() => setTab('history')}>History</button>
        </div>
      </div>

      {tab === 'create' && (
        <div className="mb-6">
          <EmailMarketingCreate />
        </div>
      )}

      {tab === 'history' && (
        <div className="mb-6">
          <EmailMarketingHistory />
        </div>
      )}

      {tab === 'subscribers' && (
        <>
          <h3 className="text-xl font-semibold mb-4">Newsletter Subscribers</h3>
      
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search email" className="border px-3 py-2 rounded w-64" />
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border px-3 py-2 rounded">
          <option value="all">All</option>
          <option value="customers">Customers Only</option>
          <option value="newsletter">Newsletter Only</option>
          <option value="verified">Verified Only</option>
          <option value="active">Active Only</option>
        </select>
        <button onClick={load} className="px-4 py-2 bg-gray-800 text-white rounded">Refresh</button>
      </div>

          <div className="bg-white border rounded overflow-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Email</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Verified</th>
                  <th className="p-3">Subscribed</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={it._id} className="border-t">
                    <td className="p-3">{it.email}</td>
                    <td className="p-3">{it.source}</td>
                    <td className="p-3">{it.isVerified ? 'Yes' : 'No'}</td>
                    <td className="p-3">{new Date(it.subscribedAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}</td>
                    <td className="p-3">{it.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailMarketingSubscribers;
