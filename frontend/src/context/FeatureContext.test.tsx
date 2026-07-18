import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { FeatureProvider, useFeatures } from './FeatureContext';

vi.mock('../api', () => ({
  api: {
    system: { getFeatures: vi.fn() }
  }
}));

import { api } from '../api';

function TestComponent() {
  const { flags } = useFeatures();
  return <div data-testid="flag">{String(flags.raptorMini)}</div>;
}

describe('FeatureContext', () => {
  beforeEach(() => {
    (api.system.getFeatures as any).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows raptorMini=true when API returns flag', async () => {
    (api.system.getFeatures as any).mockResolvedValue({ flags: { raptorMini: true } });
    render(
      <FeatureProvider>
        <TestComponent />
      </FeatureProvider>
    );
    await waitFor(() => expect(screen.getByTestId('flag')).toHaveTextContent('true'));
  });

  it('defaults to true when API fails', async () => {
    (api.system.getFeatures as any).mockRejectedValue(new Error('fail'));
    render(
      <FeatureProvider>
        <TestComponent />
      </FeatureProvider>
    );
    await waitFor(() => expect(screen.getByTestId('flag')).toHaveTextContent('true'));
  });

  it('refetches when features:changed is dispatched', async () => {
    // First call returns true; second returns false
    (api.system.getFeatures as any).mockResolvedValueOnce({ flags: { raptorMini: true } }).mockResolvedValueOnce({ flags: { raptorMini: false } });
    render(
      <FeatureProvider>
        <TestComponent />
      </FeatureProvider>
    );
    await waitFor(() => expect(screen.getByTestId('flag')).toHaveTextContent('true'));
    window.dispatchEvent(new CustomEvent('features:changed'));
    await waitFor(() => expect(screen.getByTestId('flag')).toHaveTextContent('false'));
  });
});
