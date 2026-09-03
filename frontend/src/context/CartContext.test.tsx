import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart, areCartItemsEqual } from './CartContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

describe('CartContext Product Synchronization & Matching', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly matches items across pages with hex vs name color representations', () => {
    const itemFromShop = {
      productId: '6a991a12c3cd4b96a4af85e5',
      name: 'Leather Messenger Bag',
      price: 5999,
      image: 'bag.jpg',
      size: 'One Size',
      color: '#8B4513',
      colorName: 'Brown',
      variantHex: '#8B4513',
      quantity: 1,
    };

    const itemFromMenPage = {
      productId: '6a991a12c3cd4b96a4af85e5',
      name: 'Leather Messenger Bag',
      price: 5999,
      image: 'bag.jpg',
      size: 'One Size',
      color: 'Brown',
      colorName: 'Brown',
      quantity: 1,
    };

    expect(areCartItemsEqual(itemFromShop as any, itemFromMenPage as any)).toBe(true);
  });

  it('merges identical products added from different pages into a single cart entry and respects maxStock', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Add 5 from /shop (with hex color)
    act(() => {
      result.current.addItem({
        productId: '6a991a12c3cd4b96a4af85e5',
        name: 'Leather Messenger Bag',
        price: 5999,
        image: 'bag.jpg',
        size: 'One Size',
        color: '#8B4513',
        colorName: 'Brown',
        variantHex: '#8B4513',
        quantity: 5,
        maxStock: 9,
      }, 9);
    });

    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.items[0].color).toBe('#8B4513');
    expect(result.current.items[0].colorName).toBe('Brown');

    // Add 4 from /men (with color name)
    act(() => {
      result.current.addItem({
        productId: '6a991a12c3cd4b96a4af85e5',
        name: 'Leather Messenger Bag',
        price: 5999,
        image: 'bag.jpg',
        size: 'One Size',
        color: 'Brown',
        colorName: 'Brown',
        quantity: 4,
        maxStock: 9,
      }, 9);
    });

    // Should merge into single item with quantity 9
    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].quantity).toBe(9);
    expect(result.current.items[0].color).toBe('#8B4513');
    expect(result.current.items[0].colorName).toBe('Brown');
    expect(result.current.items[0].variantHex).toBe('#8B4513');

    // Attempt to add more beyond available stock of 9
    let addResult: any;
    act(() => {
      addResult = result.current.addItem({
        productId: '6a991a12c3cd4b96a4af85e5',
        name: 'Leather Messenger Bag',
        price: 5999,
        image: 'bag.jpg',
        size: 'One Size',
        color: '#8B4513',
        quantity: 1,
        maxStock: 9,
      }, 9);
    });

    expect(addResult.success).toBe(false);
    expect(addResult.reason).toBe('MAX_REACHED');
    expect(result.current.items[0].quantity).toBe(9);
  });
});
