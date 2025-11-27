import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, vi } from 'vitest';
import { api } from '../../api';

vi.mock('../../api', async () => ({ api: { system: { getFeatures: vi.fn().mockResolvedValue({ flags: { raptorMini: true } }) } } }));
import Header from './Header';
import { FeatureProvider } from '../../context/FeatureContext';

describe('Header Feature badge', () => {
  it('shows Raptor mini badge when flag is enabled', async () => {
    render(
      <FeatureProvider>
        <Header />
      </FeatureProvider>
    );
    await waitFor(() => expect(screen.getByText(/Raptor mini/i)).toBeInTheDocument());
  });
});
