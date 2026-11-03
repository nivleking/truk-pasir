import { describe, it, expect } from 'vitest';
import { toMap } from '../../src/core/minimap';

describe('toMap', () => {
  const size = 200;
  it('puts the world center in the middle and keeps +Z (forward at spawn) pointing up', () => {
    expect(toMap({ x: 0, z: 0 }, 60, size)).toEqual({ x: 100, y: 100 });
    expect(toMap({ x: 0, z: 60 }, 60, size).y).toBeCloseTo(0);
  });
  it('maps +X to the left, matching the chase camera view from spawn', () => {
    expect(toMap({ x: 60, z: 0 }, 60, size).x).toBeCloseTo(0);
  });
});
