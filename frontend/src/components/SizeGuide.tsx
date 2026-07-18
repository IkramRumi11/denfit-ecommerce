import React from 'react';
import { X } from 'lucide-react';

interface SizeGuideProps {
  open: boolean;
  onClose: () => void;
  image?: string;
  description?: string;
  tableHtml?: string;
}

const SizeGuide: React.FC<SizeGuideProps> = ({ open, onClose, image, description, tableHtml }) => {
  React.useEffect(() => {
    if (open) {
      // lock background scroll
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return;
  }, [open]);

  if (!open) return null;

  // If there's no admin-provided size guide (image or tableHtml or description), do not render anything
  if (!image && !tableHtml && !description) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-4xl w-full mx-4 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Size Guide</h3>
          <button onClick={onClose} className="p-2 text-gray-600 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {image ? (
              // Image preview
              <img src={image} alt="Size chart" className="w-full h-auto rounded-lg shadow-sm object-contain" />
            ) : (
              <div className="w-full h-56 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">No image available</div>
            )}

            {description ? (
              <div className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
            ) : (
              <p className="text-sm text-gray-500">Sizes are based on our size chart. Minor variations may occur due to manual measurement or product design.</p>
            )}
          </div>

          <div className="overflow-auto">
            {tableHtml ? (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: tableHtml }} />
            ) : (
              // If no tableHtml is provided, do not render any default size rows - admin must supply the data
              <div className="text-sm text-gray-500">No additional size guidance provided for this product.</div>
            )}
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">Close</button>
          <a href="#" onClick={(e) => { e.preventDefault(); onClose(); window.print(); }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Print</a>
        </div>
      </div>
    </div>
  );
};

export default SizeGuide;
