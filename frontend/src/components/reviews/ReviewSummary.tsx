import React, { useEffect, useState } from 'react';
import { reviewsAPI } from '../../api';

const ReviewSummary: React.FC<{ productId: string }> = ({ productId }) => {
  const [summary, setSummary] = useState<{ average: number; count: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    reviewsAPI.summary(productId).then((res: any) => {
      const s = (res && res.data && res.data.summary) ? res.data.summary : (res && res.summary ? res.summary : null);
      if (mounted) setSummary(s);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [productId]);

  if (!summary) return null;

  if (!summary.count || summary.count <= 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-lg font-bold text-gray-900">{summary.average.toFixed(1)}</div>
      <div className="text-sm text-gray-600">{summary.count} reviews</div>
    </div>
  );
};

export default ReviewSummary;
