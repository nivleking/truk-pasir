import { describe, it, expect } from 'vitest';
import { bucketLowestY, digSite, excavatorLinks, pileGrains } from '../../src/core/excavator';

const rig = { housePivot: { x: 0, y: 1, z: 0 }, boomPivot: { x: 0, y: 0.5, z: 1 }, boomLength: 4, stickLength: 2.5 };
const id = { x: 0, y: 0, z: 0, w: 1 };
const at = { x: 0, y: 0, z: 0 };

describe('excavatorLinks', () => {
  it('raising the boom lifts the stick pivot', () => {
    const low = excavatorLinks(at, id, rig, { swing: 0, boom: 0, stick: 90, bucket: 0 });
    const high = excavatorLinks(at, id, rig, { swing: 0, boom: 40, stick: 90, bucket: 0 });
    expect(high.stick.pos.y).toBeGreaterThan(low.stick.pos.y);
    expect(low.stick.pos.z).toBeCloseTo(1 + 4);
  });
  it('stick at 90 hangs straight down from a level boom', () => {
    const l = excavatorLinks(at, id, rig, { swing: 0, boom: 0, stick: 90, bucket: 0 });
    expect(l.bucket.pos.y).toBeCloseTo(l.stick.pos.y - 2.5);
    expect(l.bucket.pos.z).toBeCloseTo(l.stick.pos.z);
  });
  it('swinging 90 degrees swings the arm toward +X', () => {
    const l = excavatorLinks(at, id, rig, { swing: 90, boom: 0, stick: 90, bucket: 0 });
    expect(l.stick.pos.x).toBeCloseTo(5);
    expect(l.stick.pos.z).toBeCloseTo(0);
  });
  it('keeps the bucket level with the house whatever the boom and stick do (self-levelling)', () => {
    const a = excavatorLinks(at, id, rig, { swing: 0, boom: 40, stick: 120, bucket: 0 });
    const b = excavatorLinks(at, id, rig, { swing: 0, boom: -10, stick: 60, bucket: 0 });
    for (const l of [a, b]) {
      expect(l.bucket.rot.x).toBeCloseTo(0);
      expect(l.bucket.rot.w).toBeCloseTo(1);
    }
  });
  it('pile grains rise into a heap', () => {
    const g = pileGrains({ x: 0, z: 0 }, 300, 0.11, 1);
    expect(Math.max(...g.map((p) => p.y))).toBeGreaterThan(0.8);
  });
});

describe('pileGrains', () => {
  it('makes exactly n grains that do not overlap', () => {
    const g = pileGrains({ x: 3, z: -2 }, 200, 0.11, 2);
    expect(g.length).toBe(200);
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) {
        const d = Math.hypot(g[i]!.x - g[j]!.x, g[i]!.y - g[j]!.y, g[i]!.z - g[j]!.z);
        expect(d).toBeGreaterThan(0.2);
      }
  });
});

describe('bucketLowestY', () => {
  it('is the pivot height minus the bucket height when level', () => {
    expect(bucketLowestY({ pos: { x: 0, y: 3, z: 0 }, rot: id }, 0.5, 1, 0.8)).toBeCloseTo(2.2);
  });
  it('reaches further down when tipped teeth-down', () => {
    const s = Math.sin(-Math.PI / 4);
    const tipped = { x: s, y: 0, z: 0, w: Math.cos(-Math.PI / 4) }; // -90 degrees about X
    expect(bucketLowestY({ pos: { x: 0, y: 3, z: 0 }, rot: tipped }, 0.5, 1, 0.8)).toBeCloseTo(2);
  });
});

describe('digSite', () => {
  const site = digSite({ x: 10, z: -5 });
  const inside = (p: { x: number; z: number }, w: { x: number; z: number; hx: number; hz: number }, pad: number) =>
    Math.abs(p.x - w.x) < w.hx + pad && Math.abs(p.z - w.z) < w.hz + pad;
  it('keeps the pile inside the bay walls and the machines clear of them', () => {
    for (const w of site.walls) {
      expect(inside(site.pile, w, site.pileRadius)).toBe(false);
      expect(inside(site.excavator, w, 2)).toBe(false);
      expect(inside(site.truck, w, 1.5)).toBe(false);
    }
  });
  it('puts the truck on the excavator\'s left (+X) and the pile in front (+Z)', () => {
    expect(site.truck.x).toBeGreaterThan(site.excavator.x + 4);
    expect(site.pile.z).toBeGreaterThan(site.excavator.z + 4);
  });
});
