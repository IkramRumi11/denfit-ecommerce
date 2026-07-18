import React, { useState, useRef } from 'react';
import { reviewsAPI } from '../../api';
import { useToast } from '../../context/ToastContext';

const ReviewForm: React.FC<{ productId: string; onSubmitted?: (review?: any) => void; review?: any; onUpdated?: (review?: any) => void; onCancel?: () => void }> = ({ productId, onSubmitted, review, onUpdated, onCancel }) => {
  const [rating, setRating] = useState<number>(review?.rating ?? 5);
  const [title, setTitle] = useState(review?.title || '');
  const [body, setBody] = useState(review?.body || '');
  const [saving, setSaving] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const { showToast } = useToast();

  const starsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const submit = async () => {
    try {
      setSaving(true);
      if (review && review._id) {
        const res: any = await reviewsAPI.update(review._id, { rating, title, body });
        const updated = (res && res.data && res.data.review) ? res.data.review : (res && res.review) ? res.review : null;
        showToast('Your review was updated', 'success');
        if (onUpdated) onUpdated(updated);
      } else {
        const res: any = await reviewsAPI.create({ product: productId, rating, title, body });
        const created = (res && res.data && res.data.review) ? res.data.review : (res && res.review) ? res.review : null;
        showToast('Thanks — your review was submitted', 'success');
        setTitle(''); setBody(''); setRating(5);
        if (onSubmitted) onSubmitted(created);
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to submit review', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Rating</label>
          <div className="text-xs text-gray-500">Select rating</div>
        </div>
        <div className="mt-2 flex items-center gap-2" role="radiogroup" aria-label="Rating">
          {([1,2,3,4,5].map((v) => {
            const active = (hoverRating ?? rating) >= v;
            return (
              <button
                key={v}
                ref={(el) => { starsRef.current[v] = el; }}
                type="button"
                role="radio"
                aria-checked={rating === v}
                tabIndex={rating === v ? 0 : -1}
                aria-label={`${v} star${v>1?'s':''}`}
                onClick={() => setRating(v)}
                onMouseEnter={() => setHoverRating(v)}
                onMouseLeave={() => setHoverRating(null)}
                onFocus={() => setHoverRating(v)}
                onBlur={() => setHoverRating(null)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const next = Math.min(5, (rating || 0) + 1);
                    setRating(next);
                    const node = starsRef.current[next];
                    if (node) node.focus();
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const prev = Math.max(1, (rating || 0) - 1);
                    setRating(prev);
                    const node = starsRef.current[prev];
                    if (node) node.focus();
                  } else if (e.key === 'Home') {
                    e.preventDefault(); setRating(1); const node = starsRef.current[1]; if (node) node.focus();
                  } else if (e.key === 'End') {
                    e.preventDefault(); setRating(5); const node = starsRef.current[5]; if (node) node.focus();
                  }
                }}
                className={`text-2xl leading-none transition-colors ${active ? 'text-yellow-400' : 'text-gray-300'} focus:outline-none cursor-pointer`}
              >
                ★
              </button>
            );
          }))}
        </div>
      </div>
      <input placeholder="Summary (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" />
      <textarea placeholder="Write your review" value={body} onChange={(e) => setBody(e.target.value)} className="w-full border rounded px-3 py-2" rows={4} />
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">{review ? 'Save changes' : 'Submit review'}</button>
        {review && onCancel && (
          <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded border">Cancel</button>
        )}
      </div>
    </div>
  );
};

export default ReviewForm;
