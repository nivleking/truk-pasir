import { describe, expect, it } from 'vitest';
import { createDumpBed } from '../../src/core/dumpBed';

const cfg = { maxAngle: 50, speed: 20 }; // degrees, degrees/second

describe('dumpBed', () => {
  it('starts down and flat', () => {
    const bed = createDumpBed(cfg);
    expect(bed.angle).toBe(0);
    expect(bed.state).toBe('down');
  });

  it('raises while holding raise', () => {
    const bed = createDumpBed(cfg);
    bed.update(1, 1);
    expect(bed.angle).toBe(20);
    expect(bed.state).toBe('raising');
  });

  it('stays where it is when no key is held', () => {
    const bed = createDumpBed(cfg);
    bed.update(1, 1);
    bed.update(1, 0);
    expect(bed.angle).toBe(20);
    expect(bed.state).toBe('holding');
  });

  it('stops at the max angle', () => {
    const bed = createDumpBed(cfg);
    bed.update(10, 1);
    expect(bed.angle).toBe(50);
    expect(bed.state).toBe('up');
  });

  it('lowers and stops at 0', () => {
    const bed = createDumpBed(cfg);
    bed.update(1, 1);
    bed.update(0.5, -1);
    expect(bed.angle).toBe(10);
    expect(bed.state).toBe('lowering');
    bed.update(5, -1);
    expect(bed.angle).toBe(0);
    expect(bed.state).toBe('down');
  });

  it('is considered dumping only past a tilt threshold', () => {
    const bed = createDumpBed(cfg);
    bed.update(0.5, 1);
    expect(bed.isDumping(25)).toBe(false);
    bed.update(1, 1);
    expect(bed.isDumping(25)).toBe(true);
  });
});
