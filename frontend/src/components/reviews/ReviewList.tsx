import React, { useEffect, useState } from 'react';
import { reviewsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import ReviewForm from './ReviewForm';
import DeleteConfirm from '../../components/ui/DeleteConfirm';
import { useToast } from '../../context/ToastContext';

const ReviewList: React.FC<{ productId: string; refreshKey?: any; prependReview?: any }> = ({ productId, refreshKey, prependReview }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { showToast } = useToast();

  // Reset to first page when product or refreshKey changes
  useEffect(() => {
    setPage(1);
  }, [productId, refreshKey]);

  useEffect(() => {
    let mounted = true;
    reviewsAPI.listForProduct(productId, page, 6).then((res: any) => {
      const data = res && res.data ? res.data : res;
      if (!mounted) return;
      setReviews(data.reviews || []);
      setTotal(data.pagination?.total || 0);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [productId, page]);

  // Prepend newly created review (live update)
  useEffect(() => {
    if (!prependReview) return;
    setReviews((prev) => {
      try {
        // Avoid duplicates
        if (prev.some(r => String(r._id || r.id) === String(prependReview._id || prependReview.id))) return prev;
      } catch (e) {}
      return [prependReview, ...(prev || [])];
    });
    setTotal(t => (t || 0) + 1);
  }, [prependReview]);

  if (!reviews.length) return <div className="text-sm text-gray-500">No reviews yet.</div>;

  const canEdit = (r: any) => {
    if (!user) return false;
    if (!r || !r._id) return false;
    if (!r.user) return false;
    const uid = (r.user._id || r.user.id || (r.user === user.id ? user.id : undefined));
    if (!uid) return false;
    if (String(uid) !== String(user._id || user.id)) return false;
    // allow within 15 minutes
    const created = new Date(r.createdAt).getTime();
    return (Date.now() - created) <= (15 * 60 * 1000);
  };

  const onDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const onUpdated = (updated: any) => {
    setEditingId(null);
    setReviews(prev => prev.map(r => (String(r._id) === String(updated._id) ? updated : r)));
  };

  return (
    <>
      <DeleteConfirm
        open={!!deleteTarget}
        title="Delete review"
        description="Are you sure you want to delete your review? This action cannot be undone."
        confirmLabel="Delete review"
        busy={deleteBusy}
        onClose={() => { setDeleteTarget(null); setDeleteBusy(false); }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setDeleteBusy(true);
            await reviewsAPI.delete(deleteTarget);
            setReviews(prev => prev.filter(x => String(x._id || x.id) !== String(deleteTarget)));
            showToast('Review deleted', 'success');
            setDeleteTarget(null);
            setDeleteBusy(false);
          } catch (err: any) {
            showToast(err?.message || 'Failed to delete review', 'error');
            setDeleteBusy(false);
          }
        }}
      />
    
    <div className="space-y-4">
      {reviews.map(r => (
        <div key={r._id} className="border rounded-lg p-3 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium">{r.user?.name || 'Customer'}</div>
              <div className="text-sm text-gray-600">{new Date(r.createdAt).toLocaleDateString()}</div>
              <div className="mt-2 text-sm text-yellow-500">{Array.from({ length: Math.round(r.rating) }).map((_, i) => '★').join('')}</div>
              {r.title && <div className="font-semibold mt-2">{r.title}</div>}
              {r.body && <div className="text-sm text-gray-700 mt-1">{r.body}</div>}
            </div>
            <div className="ml-auto flex flex-col items-end gap-2">
              {String(r.user?._id || r.user?.id) === String(user?.id || user?._id) && (
                <div className="flex items-center gap-2">
                  {canEdit(r) && (
                    <button onClick={() => setEditingId(String(r._id))} className="text-sm text-blue-600">Edit</button>
                  )}
                  <button onClick={() => onDelete(String(r._id))} className="text-sm text-red-600">Delete</button>
                </div>
              )}
            </div>
          </div>

          {editingId && String(editingId) === String(r._id) ? (
            <div className="mt-3">
              <ReviewForm productId={productId} review={r} onUpdated={onUpdated} onCancel={() => setEditingId(null)} />
            </div>
          ) : null}
        </div>
      ))}

      {total > page * 6 && (
        <div className="text-center">
          <button onClick={() => setPage(p => p + 1)} className="text-sm text-blue-600">Load more</button>
        </div>
      )}
    </div>
    </>
  );
};

export default ReviewList;
