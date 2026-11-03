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

  it('supports a negative minimum (e.g. loader arm below horizontal), starting there', () => {
    const arm = createDumpBed({ minAngle: -20, maxAngle: 60, speed: 40 });
    expect(arm.angle).toBe(-20);
    expect(arm.state).toBe('down');
    arm.update(1, 1);
    expect(arm.angle).toBe(20);
    arm.update(5, -1);
    expect(arm.angle).toBe(-20);
  });
});

describe('start angle', () => {
  it('can start between min and max', () => {
    const b = createDumpBed({ minAngle: -10, maxAngle: 60, speed: 10, start: 30 });
    expect(b.angle).toBe(30);
    expect(b.state).toBe('holding');
  });
  it('reset goes back to the start angle', () => {
    const b = createDumpBed({ minAngle: -10, maxAngle: 60, speed: 10, start: 30 });
    b.update(10, 1);
    b.reset();
    expect(b.angle).toBe(30);
  });
});
