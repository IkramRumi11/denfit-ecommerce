import React from 'react';
import { useToast } from '../context/ToastContext';

interface Props {
  trackingNumber?: string;
  trackingUrl?: string;
  className?: string;
}

const TrackingLink: React.FC<Props> = ({ trackingNumber, trackingUrl, className }) => {
  const { showToast } = useToast();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      showToast('Tracking number copied to clipboard', 'success');
    } catch (err) {
      console.error('Clipboard copy failed', err);
      showToast('Copied (fallback) — select to copy', 'info');
    }

    if (trackingUrl) {
      try {
        window.open(trackingUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Failed to open tracking URL', err);
      }
    }
  };

  if (!trackingNumber) return <>{null}</>;

  return (
    <a href={trackingUrl || '#'} onClick={handleClick} className={className || 'text-blue-600 underline'}>
      {trackingNumber}
    </a>
  );
};

export default TrackingLink;
