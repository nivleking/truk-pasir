import { describe, expect, it } from 'vitest';
import { createHopper, isUnder } from '../../src/core/hopper';

describe('isUnder', () => {
  it('is true when the bed is within radius of the hopper (ignores height)', () => {
    expect(isUnder({ x: 1, y: 2, z: 0.5 }, { x: 0, y: 6, z: 0 }, 1.5)).toBe(true);
  });

  it('is false when too far away', () => {
    expect(isUnder({ x: 3, y: 2, z: 0 }, { x: 0, y: 6, z: 0 }, 1.5)).toBe(false);
  });
});

describe('hopper', () => {
  const cfg = { rate: 10, capacity: 25 }; // grains/second, grains per load

  it('spawns nothing when the bed is not under it', () => {
    const h = createHopper(cfg);
    expect(h.update(1, false)).toBe(0);
  });

  it('spawns at the configured rate, carrying fractions across frames', () => {
    const h = createHopper(cfg);
    expect(h.update(0.25, true)).toBe(2);
    expect(h.update(0.25, true)).toBe(3);
  });

  it('stops at capacity for one load', () => {
    const h = createHopper(cfg);
    expect(h.update(10, true)).toBe(25);
    expect(h.update(1, true)).toBe(0);
    expect(h.loaded).toBe(25);
  });

  it('starts a new load after the bed drives away', () => {
    const h = createHopper(cfg);
    h.update(10, true);
    h.update(0.1, false);
    expect(h.loaded).toBe(0);
    expect(h.update(1, true)).toBe(10);
  });
});
