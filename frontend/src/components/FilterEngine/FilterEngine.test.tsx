import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterEngine } from './FilterEngine';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

const { mockGetFacets, mockGetGroups, mockGetConfig, mockGetAll } = vi.hoisted(() => ({
  mockGetFacets: vi.fn(),
  mockGetGroups: vi.fn(),
  mockGetConfig: vi.fn(),
  mockGetAll: vi.fn(),
}));

vi.mock('../../api', () => ({
  filtersAPI: {
    getFacets: mockGetFacets,
    getGroups: mockGetGroups,
    getConfig: mockGetConfig,
  },
  productsAPI: {
    getAll: mockGetAll,
  },
}));

describe('FilterEngine', () => {
  beforeEach(() => {
    mockGetFacets.mockResolvedValue({ data: { facets: {}, priceRange: { min: 0, max: 50000 } } });
    mockGetGroups.mockResolvedValue({ data: [{
      _id: 'group-1',
      name: 'Brand',
      slug: 'brand',
      type: 'multi-select',
      displayOrder: 1,
      isGlobal: true,
      options: [{ _id: 'opt-1', value: 'nike', slug: 'nike', label: 'Nike' }],
    }] });
    mockGetConfig.mockResolvedValue({ data: { groups: [] } });
    mockGetAll.mockResolvedValue({ data: { products: [], pagination: { current: 1, pages: 1, total: 0 } } });
  });

  it('renders filter sections without hook-order errors', async () => {
    render(<FilterEngine onProductsChange={() => undefined} />);

    expect(await screen.findByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Brand')).toBeInTheDocument();
  });
});
