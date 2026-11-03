import { describe, it, expect } from 'vitest';
import {
  freePlay, newCareer, parseCareer, earnings, buyVehicle, buyUpgrade, upgradeCost, tuning, owns, VEHICLE_PRICES, MAX_UPGRADE,
} from '../../src/core/career';

describe('career', () => {
  it('starts with no money and only the dump truck', () => {
    const c = newCareer();
    expect(c.money).toBe(0);
    expect(owns(c, 'dump-truck')).toBe(true);
    expect(owns(c, 'mining-truck')).toBe(false);
  });
  it('pays per delivered grain plus a bonus per star', () => {
    expect(earnings(0, 0)).toBe(0);
    expect(earnings(100, 0)).toBe(200);
    expect(earnings(100, 3)).toBe(200 + 3 * 100);
  });
  it('buys a vehicle only with enough money, once', () => {
    const price = VEHICLE_PRICES['wheel-loader'];
    expect(buyVehicle({ ...newCareer(), money: price - 1 }, 'wheel-loader')).toBeNull();
    const c = buyVehicle({ ...newCareer(), money: price + 5 }, 'wheel-loader')!;
    expect(c.money).toBe(5);
    expect(owns(c, 'wheel-loader')).toBe(true);
    expect(buyVehicle(c, 'wheel-loader')).toBeNull();
  });
  it('upgrades get pricier and stop at the max level', () => {
    expect(upgradeCost('engine', 1)).toBeGreaterThan(upgradeCost('engine', 0));
    let c = { ...newCareer(), money: 1e9 };
    for (let i = 0; i < MAX_UPGRADE; i++) c = buyUpgrade(c, 'engine')!;
    expect(c.upgrades.engine).toBe(MAX_UPGRADE);
    expect(buyUpgrade(c, 'engine')).toBeNull();
    expect(buyUpgrade({ ...newCareer(), money: 0 }, 'bed')).toBeNull();
  });
  it('turns upgrade levels into tuning multipliers', () => {
    const base = tuning(newCareer());
    expect(base).toEqual({ engine: 1, capacity: 1, grip: 0 });
    const t = tuning({ ...newCareer(), upgrades: { engine: 2, bed: 1, tires: 3 } });
    expect(t.engine).toBeCloseTo(1.3);
    expect(t.capacity).toBeCloseTo(1.15);
    expect(t.grip).toBeCloseTo(0.75);
  });
  it('parses stored data defensively', () => {
    expect(parseCareer(null)).toEqual(newCareer());
    expect(parseCareer('nope')).toEqual(newCareer());
    const c = parseCareer(JSON.stringify({ money: 50, owned: ['mining-truck', 'bogus'], upgrades: { engine: 9, bed: 'x' } }));
    expect(c.money).toBe(50);
    expect(owns(c, 'mining-truck')).toBe(true);
    expect(owns(c, 'dump-truck')).toBe(true);
    expect(c.owned).not.toContain('bogus');
    expect(c.upgrades).toEqual({ engine: MAX_UPGRADE, bed: 0, tires: 0 });
  });
});

describe('free play', () => {
  it('owns every vehicle, has no upgrades and no money', () => {
    const f = freePlay();
    expect(f.money).toBe(0);
    for (const id of ['dump-truck', 'mining-truck', 'wheel-loader'] as const) expect(owns(f, id)).toBe(true);
    expect(tuning(f)).toEqual({ engine: 1, capacity: 1, grip: 0 });
  });
});
