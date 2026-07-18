import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { Trash2 } from 'lucide-react';

const EmailMarketingHistory: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const { showToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = async () => {
    const res = await adminAPI.listCampaigns({ page: 1, limit: 200 });
    if (res && res.data) setItems(res.data.items || []);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return setDeleteOpen(false);
    setDeleteLoading(true);
    try {
      await adminAPI.deleteCampaign(deleteId);
      showToast('Campaign record deleted', 'success');
      setDeleteOpen(false);
      setDeleteId(null);
      load();
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Campaign History</h2>
      <div className="bg-white border rounded overflow-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Subject</th>
              <th className="p-3">Recipient Type</th>
              <th className="p-3">Total</th>
              <th className="p-3">Sent Date</th>
              <th className="p-3">Status</th>
              <th className="p-3"> </th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it._id} className="border-t">
                <td className="p-3">{it.recipientType === 'individual' ? 'Personal email' : it.subject}</td>
                <td className="p-3">{it.recipientType}</td>
                <td className="p-3">{it.totalRecipients}</td>
                <td className="p-3">{it.sentAt ? new Date(it.sentAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }) : '-'}</td>
                <td className="p-3">{it.status}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(it._id)} className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleteOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" aria-hidden="true" onClick={() => { if (!deleteLoading) setDeleteOpen(false); }} />
          <div className="relative z-50 w-full max-w-md p-4">
            <div className="bg-white rounded shadow-lg overflow-hidden transform transition-all duration-200 ease-out animate-modal-in">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Confirm delete</h3>
              </div>
              <div className="p-4">
                <p className="mb-4">Delete this campaign record?</p>
                <div className="flex justify-end gap-2">
                  <button className="px-3 py-2 border rounded" onClick={() => { if (!deleteLoading) setDeleteOpen(false); }} disabled={deleteLoading}>Cancel</button>
                  <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={confirmDelete} disabled={deleteLoading}>{deleteLoading ? 'Deleting...' : 'Delete'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailMarketingHistory;
