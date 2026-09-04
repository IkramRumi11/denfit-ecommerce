import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { StockMatrix } from '../StockMatrix';

describe('StockMatrix component', () => {
  afterEach(() => {
    cleanup();
  });

  const colors = [
    { tempId: 'c1', name: 'Black', hex: '#000000' },
    { tempId: 'c2', name: 'White', hex: '#ffffff' }
  ];

  it('renders nothing when colors or sizes are empty', () => {
    const { container: c1 } = render(
      <StockMatrix colors={[]} sizes={[{ id: 's1', value: 'M' }]} stock={[]} onChangeQuantity={vi.fn()} />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <StockMatrix colors={colors} sizes={[]} stock={[]} onChangeQuantity={vi.fn()} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('Scenario 1: 1 size / 1 color — total-first flow with manual cap', () => {
    const onChange = vi.fn();
    const sizes = [{ id: 's1', value: '41', quantity: 10, quantityManual: true }];
    const stock = [{ colorTempId: 'c1', sizeId: 's1', quantity: 4 }];

    render(
      <StockMatrix
        colors={[{ tempId: 'c1', name: 'Black', hex: '#000000' }]}
        sizes={sizes}
        stock={stock}
        onChangeQuantity={onChange}
      />
    );

    // Should display size name, manual badge, and remaining
    expect(screen.getByText('41')).toBeDefined();
    expect(screen.getByText('manual')).toBeDefined();
    expect(screen.getByText('6')).toBeDefined(); // Remaining: 10 - 4 = 6

    const input = screen.getByLabelText(/Qty for Black, size 41/i) as HTMLInputElement;
    expect(input.value).toBe('4');
    expect(input.getAttribute('max')).toBe('10');

    // Attempting to type more than total clamps to 10
    fireEvent.change(input, { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith('c1', 's1', 10);
  });

  it('Scenario 2: 1 size / multiple colors — manual total sets upper limit and prevents exceeding cap', () => {
    const onChange = vi.fn();
    // Size 41 with manual total = 10, Black has 6
    const sizes = [{ id: 's1', value: '41', quantity: 10, quantityManual: true }];
    const stock = [
      { colorTempId: 'c1', sizeId: 's1', quantity: 6 },
      { colorTempId: 'c2', sizeId: 's1', quantity: 2 }
    ];

    render(
      <StockMatrix
        colors={colors}
        sizes={sizes}
        stock={stock}
        onChangeQuantity={onChange}
      />
    );

    // Remaining should be 10 - (6 + 2) = 2 (also appears in White column footer)
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);

    const blackInput = screen.getByLabelText(/Qty for Black, size 41/i) as HTMLInputElement;
    const whiteInput = screen.getByLabelText(/Qty for White, size 41/i) as HTMLInputElement;

    // For White: max is 10 - 6 (Black) = 4
    expect(whiteInput.getAttribute('max')).toBe('4');

    // If user enters 5 for White, it must be clamped to 4
    fireEvent.change(whiteInput, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith('c2', 's1', 4);
  });

  it('Scenario 3: multiple sizes / 1 color — independent caps per size', () => {
    const onChange = vi.fn();
    const sizes = [
      { id: 's1', value: '41', quantity: 10, quantityManual: true },
      { id: 's2', value: '42', quantity: 20, quantityManual: true }
    ];
    const singleColor = [{ tempId: 'c1', name: 'Black', hex: '#000000' }];
    const stock = [
      { colorTempId: 'c1', sizeId: 's1', quantity: 7 },
      { colorTempId: 'c1', sizeId: 's2', quantity: 12 }
    ];

    render(
      <StockMatrix
        colors={singleColor}
        sizes={sizes}
        stock={stock}
        onChangeQuantity={onChange}
      />
    );

    const input41 = screen.getByLabelText(/Qty for Black, size 41/i) as HTMLInputElement;
    const input42 = screen.getByLabelText(/Qty for Black, size 42/i) as HTMLInputElement;

    expect(input41.getAttribute('max')).toBe('10');
    expect(input42.getAttribute('max')).toBe('20');
  });

  it('Scenario 4: multiple sizes / multiple colors — auto-calculated totals (color-first flow)', () => {
    const onChange = vi.fn();
    const sizes = [
      { id: 's1', value: '41', quantity: 7, quantityManual: false },
      { id: 's2', value: '42', quantity: 15, quantityManual: false }
    ];
    const stock = [
      { colorTempId: 'c1', sizeId: 's1', quantity: 4 },
      { colorTempId: 'c2', sizeId: 's1', quantity: 3 },
      { colorTempId: 'c1', sizeId: 's2', quantity: 10 },
      { colorTempId: 'c2', sizeId: 's2', quantity: 5 }
    ];

    render(
      <StockMatrix
        colors={colors}
        sizes={sizes}
        stock={stock}
        onChangeQuantity={onChange}
      />
    );

    // Auto badges should be shown
    const autoBadges = screen.getAllByText('auto');
    expect(autoBadges.length).toBe(2);

    // No hard max constraint when manual cap is not set
    const black41 = screen.getByLabelText(/Qty for Black, size 41/i) as HTMLInputElement;
    expect(black41.getAttribute('max')).toBeNull();

    // Changing quantity directly invokes onChange
    fireEvent.change(black41, { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith('c1', 's1', 8);

    // Grand total: 4 + 3 + 10 + 5 = 22
    expect(screen.getByText('22')).toBeDefined();
  });

  it('safely handles legacy string sizes', () => {
    const onChange = vi.fn();
    render(
      <StockMatrix
        colors={[{ tempId: 'c1', name: 'Black' }]}
        sizes={['S', 'M'] as any}
        stock={[]}
        onChangeQuantity={onChange}
      />
    );

    expect(screen.getByText('S')).toBeDefined();
    expect(screen.getByText('M')).toBeDefined();
  });
});
