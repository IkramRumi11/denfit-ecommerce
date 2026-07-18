import { describe, expect, it } from 'vitest';
import { calculateGrowthPercentage } from './dashboardGrowth';

describe('calculateGrowthPercentage', () => {
  it('returns a positive percentage when current exceeds previous', () => {
    expect(calculateGrowthPercentage(120, 100)).toBe(20);
  });

  it('returns a negative percentage when current is below previous', () => {
    expect(calculateGrowthPercentage(80, 100)).toBe(-20);
  });

  it('returns 100% when the previous period had no value and the current period has activity', () => {
    expect(calculateGrowthPercentage(5, 0)).toBe(100);
  });

  it('returns 0% when both periods are empty', () => {
    expect(calculateGrowthPercentage(0, 0)).toBe(0);
  });
});
