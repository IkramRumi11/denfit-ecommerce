import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import DeleteConfirm from '../../components/ui/DeleteConfirm';

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { showToast } = useToast();

  const load = async () => {
    try {
      const res: any = await adminAPI.listReviews({ page, limit: 25 });
      const data = res && res.data ? res.data : res;
      setReviews(data.reviews || []);
      setTotal(data.pagination?.total || 0);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [page]);

  const onApprove = async (id: string) => {
    try { await adminAPI.approveReview(id); showToast('Approved', 'success'); load(); } catch (e) { showToast('Failed', 'error'); }
  };
  const onReject = async (id: string) => {
    try { await adminAPI.rejectReview(id); showToast('Rejected', 'success'); load(); } catch (e) { showToast('Failed', 'error'); }
  };
  const onDelete = async (id: string) => {
    // open modal handled by UI state
    setDeleteTarget(id);
  };
  const onFeature = async (id: string, featured: boolean) => {
    try { await adminAPI.featureReview(id, featured); showToast('Updated', 'success'); load(); } catch (e) { showToast('Failed', 'error'); }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Reviews</h1>
      <DeleteConfirm
        open={!!deleteTarget}
        title="Delete review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel="Delete review"
        busy={deleteBusy}
        onClose={() => { setDeleteTarget(null); setDeleteBusy(false); }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setDeleteBusy(true);
            await adminAPI.deleteReview(deleteTarget);
            showToast('Review deleted', 'success');
            setDeleteTarget(null);
            setDeleteBusy(false);
            load();
          } catch (err: any) {
            const msg = (err && err.message) ? err.message : 'Failed to delete review';
            showToast(msg, 'error');
            setDeleteBusy(false);
          }
        }}
      />
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r._id} className="border rounded p-3 bg-white">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{r.user?.name || 'Customer'}</div>
                <div className="text-sm text-gray-600">{r.product?.name || ''} • {new Date(r.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}</div>
                <div className="mt-2 text-sm">{r.title}</div>
                <div className="text-sm text-gray-700 mt-1">{r.body}</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm">Status: {r.status}</div>
                <div className="flex gap-2">
                  <button onClick={() => onApprove(r._id)} className="px-2 py-1 bg-green-600 text-white rounded">Approve</button>
                  <button onClick={() => onReject(r._id)} className="px-2 py-1 bg-yellow-600 text-white rounded">Reject</button>
                  <button onClick={() => onFeature(r._id, !r.featured)} className="px-2 py-1 bg-blue-600 text-white rounded">{r.featured ? 'Unfeature' : 'Feature'}</button>
                  <button onClick={() => onDelete(r._id)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {total > page * 25 && (
        <div className="mt-4 text-center">
          <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-gray-800 text-white rounded">Load more</button>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
