import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, vi, beforeEach } from 'vitest';
import AdminFeatures from './AdminFeatures';
import { FeatureProvider } from '../../context/FeatureContext';
import Header from '../../components/layout/Header';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../context/ToastContext';
import { SearchProvider } from '../../context/SearchContext';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import { WishlistProvider } from '../../context/WishlistContext';
import { NotificationProvider } from '../../context/NotificationContext';

vi.mock('../../api', () => ({
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

import { api } from '../../api';

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
      <MemoryRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <SearchProvider>
                <ToastProvider>
                  <NotificationProvider>
                    <FeatureProvider>
                      <AdminFeatures />
                    </FeatureProvider>
                  </NotificationProvider>
                </ToastProvider>
              </SearchProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
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
      <MemoryRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <SearchProvider>
                <ToastProvider>
                  <NotificationProvider>
                    <FeatureProvider>
                      <Header />
                      <AdminFeatures />
                    </FeatureProvider>
                  </NotificationProvider>
                </ToastProvider>
              </SearchProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Ensure system feature fetch is used and will be called on refresh
    await waitFor(() => expect(api.system.getFeatures).toHaveBeenCalled());

    // Toggle the flag
    const btn = await screen.findByText('Disable');
    fireEvent.click(btn);
    await waitFor(() => expect(api.admin.updateFeatureFlag).toHaveBeenCalled());

    // After toggle, the FeatureProvider should refresh features (called again)
    await waitFor(() => expect(api.system.getFeatures).toHaveBeenCalledTimes(2));
  });
});
