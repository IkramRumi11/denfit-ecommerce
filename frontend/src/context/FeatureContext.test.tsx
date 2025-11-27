import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { FeatureProvider, useFeatures } from './FeatureContext';
import { api } from '../api';

vi.mock('../api', async () => ({
  api: {
    system: { getFeatures: vi.fn() }
  }
}));

function TestComponent() {
  const features = useFeatures();
  return <div data-testid="flag">{String(features.raptorMini)}</div>;
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
});
