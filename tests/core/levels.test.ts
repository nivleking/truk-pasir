import { describe, it, expect } from 'vitest';
import { LEVELS, findLevel, starsFor, isUnlocked, parseProgress, recordStars, PIT, groundBoxes, inPit } from '../../src/core/levels';

const inside = (p: { x: number; z: number }, margin: number) => Math.abs(p.x) <= 60 - margin && Math.abs(p.z) <= 60 - margin;

describe('levels', () => {
  it('has unique ids and at least 3 levels', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });
  it('keeps hopper, pit and spawn inside the map', () => {
    for (const l of LEVELS) {
      expect(inside(l.hopper, 5)).toBe(true);
      expect(inside(l.pit, PIT.half + 3)).toBe(true);
      expect(inside(l.spawn, 5)).toBe(true);
    }
  });
  it('obstacles never block the spawn, hopper or pit', () => {
    for (const l of LEVELS)
      for (const o of l.obstacles) {
        const r = Math.hypot(o.hx, o.hz);
        expect(Math.hypot(o.x - l.spawn.x, o.z - l.spawn.z), `${l.id} spawn`).toBeGreaterThan(r + 6);
        expect(Math.hypot(o.x - l.hopper.x, o.z - l.hopper.z), `${l.id} hopper`).toBeGreaterThan(r + 4);
        expect(Math.hypot(o.x - l.pit.x, o.z - l.pit.z), `${l.id} pit`).toBeGreaterThan(r + PIT.half + 3);
      }
  });
  it('findLevel falls back to the first level', () => {
    expect(findLevel('nope').id).toBe(LEVELS[0]!.id);
  });
});

describe('stars', () => {
  const l = { targetSeconds: 60 };
  it('needs 50% for one star, 75% for two, 90% within target time for three', () => {
    expect(starsFor(l, 40, 10)).toBe(0);
    expect(starsFor(l, 50, 999)).toBe(1);
    expect(starsFor(l, 80, 999)).toBe(2);
    expect(starsFor(l, 95, 999)).toBe(2);
    expect(starsFor(l, 95, 50)).toBe(3);
  });
});

describe('progress', () => {
  it('first level is always open, the next needs a star on the previous', () => {
    expect(isUnlocked(0, {})).toBe(true);
    expect(isUnlocked(1, {})).toBe(false);
    expect(isUnlocked(1, { [LEVELS[0]!.id]: 1 })).toBe(true);
  });
  it('keeps the best stars and parses defensively', () => {
    let p = recordStars({}, 'a', 2);
    p = recordStars(p, 'a', 1);
    expect(p.a).toBe(2);
    expect(parseProgress('garbage')).toEqual({});
    expect(parseProgress(JSON.stringify({ a: 3, b: 'x', c: 9 }))).toEqual({ a: 3 });
  });
});

describe('groundBoxes', () => {
  const pit = { x: 10, z: -5 };
  const boxes = groundBoxes(pit, 100);
  const covers = (x: number, z: number, b: (typeof boxes)[number]) => Math.abs(x - b.x) <= b.hx && Math.abs(z - b.z) <= b.hz;
  it('leaves a hole over the pit and a floor below it', () => {
    const atCenter = boxes.filter((b) => covers(10, -5, b));
    expect(atCenter.every((b) => b.y + b.hy <= -PIT.depth + 1e-6)).toBe(true);
    expect(atCenter.some((b) => b.part === 'floor')).toBe(true);
  });
  it('has ground just outside the pit and a curb at each edge', () => {
    for (const [x, z] of [[10 + PIT.half + 1, -5], [10, -5 - PIT.half - 1]] as const)
      expect(boxes.some((b) => b.part === 'ground' && covers(x, z, b))).toBe(true);
    expect(boxes.filter((b) => b.part === 'curb').length).toBe(4);
  });
});

describe('inPit', () => {
  it('counts only grains below ground inside the square', () => {
    expect(inPit({ x: 1, y: -0.5, z: 1 }, { x: 0, z: 0 })).toBe(true);
    expect(inPit({ x: 1, y: 0.3, z: 1 }, { x: 0, z: 0 })).toBe(false);
    expect(inPit({ x: 5, y: -0.5, z: 1 }, { x: 0, z: 0 })).toBe(false);
  });
});
