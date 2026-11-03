import { describe, it, expect } from 'vitest';
import { createParticles } from '../../src/core/particles';
import { createTireTracks } from '../../src/core/tireTracks';

describe('particles', () => {
  it('ages particles and drops them when their life is over', () => {
    const ps = createParticles(10);
    ps.emit({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 1, 0.5);
    ps.update(0.5);
    expect(ps.count).toBe(1);
    expect(ps.items[0]!.x).toBeGreaterThan(0);
    expect(ps.items[0]!.alpha).toBeLessThan(1);
    ps.update(0.6);
    expect(ps.count).toBe(0);
  });
  it('grows puffs and slows them down', () => {
    const ps = createParticles(10);
    ps.emit({ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, 2, 0.5);
    const p = ps.items[0]!;
    ps.update(0.5);
    expect(p.size).toBeGreaterThan(0.5);
    expect(Math.abs(p.vx)).toBeLessThan(4);
  });
  it('replaces the oldest particle when full', () => {
    const ps = createParticles(2);
    ps.emit({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 5, 1);
    ps.update(0.1);
    ps.emit({ x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 5, 1);
    ps.emit({ x: 3, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 5, 1);
    expect(ps.count).toBe(2);
    expect(ps.items.slice(0, ps.count).map((p) => p.x).sort()).toEqual([2, 3]);
  });
  it('clear removes everything', () => {
    const ps = createParticles(4);
    ps.emit({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1, 1);
    ps.clear();
    expect(ps.count).toBe(0);
  });
});

describe('tire tracks', () => {
  it('lays a segment only after the wheel moved far enough', () => {
    const t = createTireTracks(100, 0.3);
    t.touch(0, { x: 0, y: 0, z: 0 }, 0.5);
    t.touch(0, { x: 0.1, y: 0, z: 0 }, 0.5);
    expect(t.segments.length).toBe(0);
    t.touch(0, { x: 0.5, y: 0, z: 0 }, 0.5);
    expect(t.segments.length).toBe(1);
    expect(t.segments[0]).toMatchObject({ ax: 0, az: 0, bx: 0.5, bz: 0, width: 0.5 });
  });
  it('a wheel that leaves the ground starts a new track instead of bridging the gap', () => {
    const t = createTireTracks(100, 0.3);
    t.touch(0, { x: 0, y: 0, z: 0 }, 0.5);
    t.lift(0);
    t.touch(0, { x: 5, y: 0, z: 0 }, 0.5);
    t.touch(0, { x: 5.5, y: 0, z: 0 }, 0.5);
    expect(t.segments.length).toBe(1);
    expect(t.segments[0]!.ax).toBe(5);
  });
  it('keeps the newest segments up to its capacity', () => {
    const t = createTireTracks(3, 0.3);
    for (let i = 0; i <= 5; i++) t.touch(0, { x: i, y: 0, z: 0 }, 0.5);
    expect(t.segments.length).toBe(3);
    expect(t.segments[2]!.bx).toBe(5);
    expect(t.version).toBeGreaterThan(0);
  });
  it('wheels are tracked separately', () => {
    const t = createTireTracks(10, 0.3);
    t.touch(0, { x: 0, y: 0, z: 0 }, 0.5);
    t.touch(1, { x: 0, y: 0, z: 2 }, 0.5);
    t.touch(0, { x: 1, y: 0, z: 0 }, 0.5);
    t.touch(1, { x: 1, y: 0, z: 2 }, 0.5);
    expect(t.segments.map((s) => s.az)).toEqual([0, 2]);
  });
});
