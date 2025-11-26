import React from 'react';

// This component should use the onAddToCart prop passed from parent
// and not use CartContext directly if it's meant to be controlled by parent
export const ProductModal: React.FC<{ onAddToCart?: (size: string) => void }> = () => {
  // If this modal needs to use cart directly, use:
  // const { addItem } = useCart();
  
  return (
    <div>
      {/* Modal content */}
    </div>
  );
};
