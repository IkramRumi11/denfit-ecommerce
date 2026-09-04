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
  const safeSizes = sizes.map((s: any, idx: number) =>
    typeof s === 'string' ? { id: `size_legacy_${idx}`, value: s, inStock: true, quantity: null, quantityManual: false } : s
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-1">Size × Color Stock Matrix</h2>
      <p className="text-xs text-gray-500 mb-4">
        Set quantities per color for each size. Enter a size total first to set an upper limit, or enter color quantities to auto-calculate the total.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                Size
              </th>
              {colors.map((c: any) => (
                <th key={c.tempId} className="text-center px-3 py-2 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: c.hex || c.value || 'transparent' }}
                    />
                    <span>{c.name || c.value || c.hex || c.tempId}</span>
                  </div>
                </th>
              ))}
              <th className="text-center px-3 py-2 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                Total
              </th>
              <th className="text-center px-3 py-2 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                Remaining
              </th>
            </tr>
          </thead>
          <tbody>
            {safeSizes.map((sz: any) => {
              const sizeTotal = sz.quantity;
              const isManual = !!sz.quantityManual;

              // Calculate sum of all color quantities for this size
              const colorSum = colors.reduce((sum: number, c: any) => {
                const entry = safeStock.find(
                  (st: any) => String(st.colorTempId) === String(c.tempId) && String(st.sizeId) === String(sz.id)
                );
                return sum + (entry ? (Number(entry.quantity) || 0) : 0);
              }, 0);

              const displayTotal = isManual && sizeTotal != null ? Number(sizeTotal) : colorSum;
              const remaining = isManual && sizeTotal != null ? Number(sizeTotal) - colorSum : 0;
              const isOverLimit = isManual && sizeTotal != null && colorSum > Number(sizeTotal);

              return (
                <tr
                  key={sz.id}
                  className={`border-b border-gray-100 ${isOverLimit ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                    {sz.value || sz.id}
                  </td>
                  {colors.map((c: any) => {
                    const entry = safeStock.find(
                      (st: any) => String(st.colorTempId) === String(c.tempId) && String(st.sizeId) === String(sz.id)
                    );
                    const currentVal = entry ? entry.quantity : null;

                    // Compute max for this input: if manual total is set, max = total - sum of other colors
                    let maxVal: number | undefined;
                    if (isManual && sizeTotal != null) {
                      const othersSum = colors.reduce((sum: number, oc: any) => {
                        if (oc.tempId === c.tempId) return sum;
                        const oe = safeStock.find(
                          (st: any) => String(st.colorTempId) === String(oc.tempId) && String(st.sizeId) === String(sz.id)
                        );
                        return sum + (oe ? (Number(oe.quantity) || 0) : 0);
                      }, 0);
                      maxVal = Math.max(0, Number(sizeTotal) - othersSum);
                    }

                    return (
                      <td key={c.tempId} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={maxVal}
                          aria-label={`Qty for ${c.name || c.tempId}, size ${sz.value}`}
                          value={currentVal != null ? currentVal : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            // Enforce max if manual cap is set
                            if (val !== null && maxVal !== undefined && val > maxVal) {
                              onChangeQuantity(c.tempId, sz.id, maxVal);
                            } else {
                              onChangeQuantity(c.tempId, sz.id, val);
                            }
                          }}
                          className={`w-16 px-2 py-1.5 border rounded text-sm text-center transition-colors ${
                            isOverLimit
                              ? 'border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`font-semibold text-sm ${isOverLimit ? 'text-red-600' : 'text-gray-800'}`}>
                        {displayTotal}
                      </span>
                      {isManual ? (
                        <span className="text-[10px] text-blue-600 font-medium">manual</span>
                      ) : colorSum > 0 ? (
                        <span className="text-[10px] text-green-600 font-medium">auto</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isManual && sizeTotal != null ? (
                      <span className={`font-medium text-sm ${
                        isOverLimit ? 'text-red-600' : remaining === 0 ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {isOverLimit ? `−${Math.abs(remaining)}` : remaining}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-medium">
              <td className="px-3 py-2 border-t border-gray-200 text-gray-700">Grand Total</td>
              {colors.map((c: any) => {
                const colorTotal = safeSizes.reduce((sum: number, sz: any) => {
                  const entry = safeStock.find(
                    (st: any) => String(st.colorTempId) === String(c.tempId) && String(st.sizeId) === String(sz.id)
                  );
                  return sum + (entry ? (Number(entry.quantity) || 0) : 0);
                }, 0);
                return (
                  <td key={c.tempId} className="px-3 py-2 border-t border-gray-200 text-center text-gray-700">
                    {colorTotal}
                  </td>
                );
              })}
              <td className="px-3 py-2 border-t border-gray-200 text-center text-gray-800 font-bold">
                {safeStock.reduce((sum: number, st: any) => sum + (Number(st.quantity) || 0), 0)}
              </td>
              <td className="px-3 py-2 border-t border-gray-200"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
