import React, { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const PrivacyModal: React.FC<Props> = ({ open, onClose }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const el = modalRef.current;
    const firstFocusable = el?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement | null;
    (firstFocusable || el)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && el) {
        const focusables = el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" className="relative bg-gradient-to-b from-white to-neutral-100 rounded-3xl shadow-2xl w-full max-w-2xl p-8 transform transition-all duration-300 scale-100 animate-slideUp">
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-gray-400 hover:text-black transition-colors text-2xl"
        >
          ×
        </button>

        <h3 className="text-2xl font-semibold tracking-[0.2em] text-neutral-900 mb-4 text-center">
          Privacy Policy
        </h3>

        <div className="max-h-[70vh] overflow-y-auto pr-2 text-[15px] leading-relaxed text-neutral-700 space-y-4 custom-scroll">
          <p>
            At <strong>DENFiT</strong>, we value your privacy as much as we value design. Your data is protected with
            enterprise-grade security and encrypted at rest and in transit.
          </p>
          <p>
            We collect only essential information needed to deliver and enhance your shopping experience. This includes
            account data, preferences, and transactional records.
          </p>
          <p>
            DENFiT does <strong>not</strong> sell or share your data with unauthorized third parties. You can request account
            deletion or data export at any time.
          </p>
          <p>
            By using DENFiT, you consent to this policy and its future updates. We continuously strive to ensure your
            information is handled with care and transparency.
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-all text-sm tracking-[0.26em]"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
