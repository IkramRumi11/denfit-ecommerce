import React from 'react';

interface StockMatrixProps {
  colors: any[];
  sizes: any[];
  stock: any[];
  onChangeQuantity: (colorTempId: string, sizeId: string, quantity: number | null) => void;
}

export const StockMatrix: React.FC<StockMatrixProps> = ({
  colors,
  sizes,
  stock,
  onChangeQuantity
}) => {
  if (!Array.isArray(colors) || colors.length === 0 || !Array.isArray(sizes) || sizes.length === 0) {
    return null;
  }

  const safeStock = Array.isArray(stock) ? stock : [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-3">Per-color Quantities</h2>
      <div className="space-y-4">
        {colors.map((c: any) => (
          <div key={c.tempId} className="p-3 border rounded">
            <div className="font-medium mb-2">{c.name || c.value || c.hex || c.tempId} Quantity</div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 min-w-full">
                {sizes.map((sz: any) => {
                  const sizeObj = typeof sz === 'string' ? { id: `size_legacy_${sz}`, value: sz } : sz;
                  const existing = safeStock.find((st: any) => String(st.colorTempId) === String(c.tempId) && String(st.sizeId) === String(sizeObj.id));
                  return (
                    <div key={sizeObj.id} className="flex flex-col items-start sm:items-center gap-1 min-w-[88px]">
                      <div className="text-sm text-gray-700 truncate w-full text-left sm:text-center">{sizeObj.value}</div>
                      <input
                        type="number"
                        min={0}
                        aria-label={`Quantity for ${c.name || c.tempId} size ${sizeObj.value}`}
                        value={existing ? (existing.quantity ?? '') : ''}
                        onChange={(e) => onChangeQuantity(c.tempId, sizeObj.id, e.target.value === '' ? null : Number(e.target.value))}
                        className="w-20 px-2 py-1 border rounded text-sm text-center"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
