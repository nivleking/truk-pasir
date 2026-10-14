import { describe, expect, it } from 'vitest';
import { generateBumps } from '../../src/core/bumps';

const opts = {
  seed: 42,
  count: 30,
  from: { x: 0, z: 22 },
  to: { x: 26, z: -20 },
  corridorHalfWidth: 6,
  keepClear: [
    { x: 0, z: 22, radius: 7 },
    { x: 26, z: -20, radius: 8 },
  ],
};

describe('generateBumps', () => {
  it('is deterministic for the same seed', () => {
    expect(generateBumps(opts)).toEqual(generateBumps(opts));
  });

  it('differs for a different seed', () => {
    expect(generateBumps({ ...opts, seed: 7 })).not.toEqual(generateBumps(opts));
  });

  it('returns the requested count', () => {
    expect(generateBumps(opts)).toHaveLength(30);
  });

  it('keeps clear of the hopper and the dump zone', () => {
    for (const b of generateBumps(opts)) {
      for (const c of opts.keepClear) expect(Math.hypot(b.x - c.x, b.z - c.z)).toBeGreaterThan(c.radius);
    }
  });

  it('stays inside the corridor between the two points', () => {
    const dx = opts.to.x - opts.from.x;
    const dz = opts.to.z - opts.from.z;
    const len = Math.hypot(dx, dz);
    for (const b of generateBumps(opts)) {
      const dist = Math.abs((b.x - opts.from.x) * dz - (b.z - opts.from.z) * dx) / len;
      expect(dist).toBeLessThanOrEqual(opts.corridorHalfWidth + 1e-9);
    }
  });
});
