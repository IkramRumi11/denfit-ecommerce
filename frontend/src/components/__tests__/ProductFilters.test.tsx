import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import ProductFilters from '../ProductFilters';

describe('ProductFilters accessibility and color behavior', () => {
  const onFilterChange = vi.fn();

  beforeEach(() => {
    onFilterChange.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders color buttons with accessible labels and toggles filter on click', () => {
    const colors = ['#ff0000', 'blue'];
    render(<ProductFilters onFilterChange={onFilterChange} colors={colors} sizes={[]} initialFilters={{}} />);

    // The red hex should map to friendly name 'Red' from colorNames
    const redButton = screen.getByRole('button', { name: /filter by color red/i });
    expect(redButton).toBeTruthy();

    // Click the red button to set the color filter
    fireEvent.click(redButton);
    expect(onFilterChange).toHaveBeenCalled();
    const calledWith = onFilterChange.mock.calls[0][0];
    expect(calledWith).toHaveProperty('color', '#ff0000');
  });
});
