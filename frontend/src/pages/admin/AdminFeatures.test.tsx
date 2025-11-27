import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, vi, beforeEach } from 'vitest';
import AdminFeatures from './AdminFeatures';
import { FeatureProvider } from '../../context/FeatureContext';
import Header from '../../components/layout/Header';
import { api } from '../../api';

vi.mock('../../api', async () => ({
  api: {
    admin: {
      getFeatureFlags: vi.fn(),
      getAllUsers: vi.fn(),
      createFeatureFlag: vi.fn(),
      updateFeatureFlag: vi.fn(),
      deleteFeatureFlag: vi.fn()
    },
    system: {
      getFeatures: vi.fn()
    }
  }
}));

describe('AdminFeatures page', () => {
  beforeEach(() => {
    (api.admin.getFeatureFlags as any).mockReset();
    (api.admin.getAllUsers as any).mockReset();
    (api.admin.updateFeatureFlag as any).mockReset();
    (api.admin.createFeatureFlag as any).mockReset();
  });

  it('toggles a flag and dispatches features:changed', async () => {
    (api.admin.getFeatureFlags as any).mockResolvedValue({ data: { flags: [{ _id: '1', name: 'RAPTOR_MINI', enabled: true, target: 'global' }] } });
    (api.admin.updateFeatureFlag as any).mockResolvedValue({ data: { flag: { _id: '1', enabled: false } } });
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(
      <FeatureProvider>
        <AdminFeatures />
      </FeatureProvider>
    );
    await waitFor(() => expect(api.admin.getFeatureFlags).toHaveBeenCalled());
    const btn = await screen.findByText('Disable');
    fireEvent.click(btn);
    await waitFor(() => expect(api.admin.updateFeatureFlag).toHaveBeenCalled());
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
  });

  it('toggle updates header badge via feature refresh', async () => {
    // Setup: first call returns true, after toggle it becomes false
    (api.admin.getFeatureFlags as any).mockResolvedValue({ data: { flags: [{ _id: '1', name: 'RAPTOR_MINI', enabled: true, target: 'global' }] } });
    (api.admin.updateFeatureFlag as any).mockResolvedValue({ data: { flag: { _id: '1', enabled: false } } });
    // system.getFeatures: first returns true, then returns false when refreshed
    (api.system.getFeatures as any).mockResolvedValueOnce({ flags: { raptorMini: true } }).mockResolvedValueOnce({ flags: { raptorMini: false } });

    render(
      <FeatureProvider>
        <Header />
        <AdminFeatures />
      </FeatureProvider>
    );

    // Header initially shows badge
    await waitFor(() => expect(screen.getByText(/Raptor mini/i)).toBeInTheDocument());

    // Toggle the flag
    const btn = await screen.findByText('Disable');
    fireEvent.click(btn);
    await waitFor(() => expect(api.admin.updateFeatureFlag).toHaveBeenCalled());

    // After refresh, header badge should disappear
    await waitFor(() => expect(screen.queryByText(/Raptor mini/i)).toBeNull());
  });
});
