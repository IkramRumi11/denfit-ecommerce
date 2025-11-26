import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const TermsModal: React.FC<Props> = ({ open, onClose }) => {
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
          Terms of Service
        </h3>

        <div className="max-h-[70vh] overflow-y-auto pr-2 text-[15px] leading-relaxed text-neutral-700 space-y-4 custom-scroll">
          <p>
            Welcome to <strong>DENFiT</strong>. By accessing or using our platform, you agree to these Terms of Service.
          </p>
          <p>
            We are committed to maintaining a respectful, safe, and elegant digital environment. Users are expected to behave
            ethically, avoiding misuse of our services or intellectual property.
          </p>
          <p>
            DENFiT reserves the right to modify, suspend, or discontinue services at its discretion. Continued use of the
            platform after updates constitutes acceptance of the revised terms.
          </p>
          <p>
            Violations may result in temporary or permanent account suspension. We appreciate your trust and commitment to
            maintaining a world-class community.
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

export default TermsModal;
