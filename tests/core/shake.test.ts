import { describe, it, expect } from 'vitest';
import { shakeOffset } from '../../src/core/shake';

describe('shakeOffset', () => {
  it('is zero unless the bed is up and raise is held', () => {
    expect(shakeOffset(0.1, 'raising', 1)).toBe(0);
    expect(shakeOffset(0.1, 'up', 0)).toBe(0);
  });
  it('oscillates within amplitude when held at the top', () => {
    const vals = [0, 0.02, 0.04, 0.06, 0.08].map((t) => shakeOffset(t, 'up', 1));
    expect(vals.some((v) => v !== 0)).toBe(true);
    for (const v of vals) expect(Math.abs(v)).toBeLessThanOrEqual(4);
    expect(Math.min(...vals)).toBeLessThan(0);
  });
});
