import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const TrackingRedirect: React.FC = () => {
  const q = useQuery();
  const tn = q.get('tn') || '';
  const u = q.get('u') || '';
  const { showToast } = useToast();

  useEffect(() => {
    let opened = false;
    const doCopyAndOpen = async () => {
      if (tn) {
        try {
          await navigator.clipboard.writeText(tn);
          showToast('Tracking number copied to clipboard', 'success');
        } catch (err) {
          console.warn('Clipboard write failed', err);
          showToast('Unable to copy automatically — use the link below', 'info');
        }
      }

      if (u) {
        try {
          window.open(u, '_blank', 'noopener,noreferrer');
          opened = true;
        } catch (err) {
          console.warn('Failed to open tracking URL', err);
        }
      }
    };

    // Run on mount (this is triggered by the email click navigation)
    doCopyAndOpen();

    // If nothing opened, don't auto-redirect away from helpful page.
    return () => {};
  }, [tn, u, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-xl font-semibold mb-3">Opening tracking link</h1>
        <p className="mb-4">We attempted to copy your tracking number to the clipboard and open the courier tracking page.</p>
        <div className="mb-4">
          <div className="font-mono break-words bg-gray-50 p-3 rounded">{tn || 'No tracking number provided'}</div>
        </div>
        {u ? (
          <p className="text-sm text-gray-600">If the courier page did not open, <a href={u} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">click here</a>.</p>
        ) : (
          <p className="text-sm text-gray-600">No tracking URL provided. You can copy the tracking number above.</p>
        )}
        <div className="mt-6">
          <Link to="/orders" className="px-4 py-2 rounded bg-slate-800 text-white">Back to orders</Link>
        </div>
      </div>
    </div>
  );
};

export default TrackingRedirect;
