import { describe, it, expect } from 'vitest';
import { scaleQuantity, formatQuantity } from '../scale';

describe('scaleQuantity', () => {
  it('rounds to integers when >= 10', () => {
    expect(scaleQuantity(100, 2, 4)).toBe(200);
    expect(scaleQuantity(15.7, 2, 2)).toBe(16);
  });

  it('rounds to one decimal when 1..10', () => {
    expect(scaleQuantity(2, 2, 3)).toBe(3);
    expect(scaleQuantity(2.34, 2, 2)).toBe(2.3);
  });

  it('rounds to two decimals when < 1', () => {
    expect(scaleQuantity(1, 2, 1)).toBe(0.5);
    expect(scaleQuantity(0.337, 1, 1)).toBe(0.34);
  });

  it('handles target equal to base', () => {
    expect(scaleQuantity(123, 2, 2)).toBe(123);
  });

  it('does not divide by zero', () => {
    expect(scaleQuantity(50, 0, 4)).toBe(50);
  });
});

describe('formatQuantity', () => {
  it('formats integers without decimals', () => {
    expect(formatQuantity(5)).toBe('5');
  });
  it('strips trailing zeros', () => {
    expect(formatQuantity(2.5)).toBe('2.5');
    expect(formatQuantity(0.5)).toBe('0.5');
  });
});
