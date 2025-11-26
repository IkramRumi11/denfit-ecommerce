import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const PrivacyModal: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="relative bg-gradient-to-b from-white to-neutral-100 rounded-3xl shadow-2xl w-full max-w-2xl p-8 transform transition-all duration-300 scale-100 animate-slideUp">
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-gray-400 hover:text-black transition-colors text-2xl"
        >
          ×
        </button>

        <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-4 text-center">
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
            className="px-6 py-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-all text-sm tracking-wide"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
