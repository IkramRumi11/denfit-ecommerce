import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock contexts used by Header
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'user@example.com', verified: false }, logout: vi.fn() }),
}));
vi.mock('../../../context/SearchContext', () => ({ useSearch: () => ({ setQuery: vi.fn() }) }));
vi.mock('../../../context/WishlistContext', () => ({ useWishlist: () => ({ items: [] as any[], addToWishlist: vi.fn(), removeFromWishlist: vi.fn() }) }));
vi.mock('../../../context/NotificationContext', () => ({ useNotifications: () => ({ notifications: [], dismissNotification: vi.fn(), clearNotifications: vi.fn() }) }));
vi.mock('../../../context/FeatureContext', () => ({ useFeatures: () => ({}) }));

// Mock Toast hook so we can assert calls
const showToastMock = vi.fn();
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ showToast: showToastMock, hideToast: vi.fn() }) }));

import Header from '../Header';

describe('Header', () => {
  beforeEach(() => {
    // Clear sessionStorage to ensure no persisted key exists
    sessionStorage.clear();
    showToastMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows verification toast only once per session even if Header remounts', () => {
    const { unmount } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should have been called once on first mount
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith('Please verify your email to unlock all features.', 'warning');

    // Remount header simulating a navigation change
    unmount();
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should still only be called once due to sessionStorage dedupe
    expect(showToastMock).toHaveBeenCalledTimes(1);
  });
});
