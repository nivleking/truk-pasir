import { describe, it, expect } from 'vitest';
import { createOrbit } from '../../src/core/orbit';

describe('orbit camera offset', () => {
  it('starts neutral', () => {
    const o = createOrbit();
    expect(o.yaw).toBe(0);
    expect(o.lift).toBe(0);
    expect(o.zoom).toBe(1);
  });
  it('drag rotates around and up, lift is clamped', () => {
    const o = createOrbit();
    o.drag(100, 0);
    expect(o.yaw).not.toBe(0);
    o.drag(0, -10000);
    expect(o.lift).toBe(1);
    o.drag(0, 10000);
    expect(o.lift).toBe(-0.6);
  });
  it('yaw wraps within ±π', () => {
    const o = createOrbit();
    o.drag(100000, 0);
    expect(Math.abs(o.yaw)).toBeLessThanOrEqual(Math.PI);
  });
  it('zoom is clamped and reset restores defaults', () => {
    const o = createOrbit();
    o.wheel(100000);
    expect(o.zoom).toBe(2.5);
    o.wheel(-100000);
    expect(o.zoom).toBe(0.5);
    o.drag(50, 50);
    o.reset();
    expect([o.yaw, o.lift, o.zoom]).toEqual([0, 0, 1]);
  });
});
