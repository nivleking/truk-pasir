import { describe, expect, it } from 'vitest';
import { chaseOffset, followFactor } from '../../src/core/chaseCam';

describe('chaseOffset', () => {
  it('sits behind and above a truck facing +Z', () => {
    const p = chaseOffset({ x: 0, y: 0, z: 0 }, 0, 10, 4);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(4);
    expect(p.z).toBeCloseTo(-10);
  });

  it('rotates with the truck heading', () => {
    const p = chaseOffset({ x: 5, y: 1, z: 5 }, Math.PI / 2, 10, 4);
    expect(p.x).toBeCloseTo(-5);
    expect(p.z).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(5);
  });
});

describe('followFactor', () => {
  it('is 0 for no time and approaches 1 for long time', () => {
    expect(followFactor(0, 5)).toBe(0);
    expect(followFactor(10, 5)).toBeGreaterThan(0.999);
  });

  it('is frame-rate independent: two half steps equal one full step', () => {
    const one = followFactor(0.1, 5);
    const half = followFactor(0.05, 5);
    expect(1 - (1 - half) ** 2).toBeCloseTo(one);
  });
});
