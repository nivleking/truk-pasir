import { describe, expect, it } from 'vitest';
import { computeScore } from '../../src/core/score';

describe('computeScore', () => {
  it('is zero when nothing was loaded', () => {
    expect(computeScore({ loaded: 0, delivered: 0, seconds: 10 })).toEqual({ percent: 0, timeBonus: 0, total: 0, rank: 'C' });
  });

  it('gives percent delivered, rounded', () => {
    expect(computeScore({ loaded: 200, delivered: 151, seconds: 200 }).percent).toBe(76);
  });

  it('gives a time bonus of 5 points per second under 90s', () => {
    expect(computeScore({ loaded: 100, delivered: 100, seconds: 60 }).timeBonus).toBe(150);
    expect(computeScore({ loaded: 100, delivered: 100, seconds: 120 }).timeBonus).toBe(0);
  });

  it('gives no time bonus when nothing was delivered', () => {
    expect(computeScore({ loaded: 100, delivered: 0, seconds: 10 }).timeBonus).toBe(0);
  });

  it('total = percent * 10 + time bonus', () => {
    expect(computeScore({ loaded: 100, delivered: 80, seconds: 70 }).total).toBe(800 + 100);
  });

  it('ranks by percent delivered', () => {
    const rank = (d: number) => computeScore({ loaded: 100, delivered: d, seconds: 100 }).rank;
    expect(rank(95)).toBe('S');
    expect(rank(80)).toBe('A');
    expect(rank(55)).toBe('B');
    expect(rank(20)).toBe('C');
  });

  it('never exceeds 100% even if counting overlaps', () => {
    expect(computeScore({ loaded: 100, delivered: 105, seconds: 100 }).percent).toBe(100);
  });
});
