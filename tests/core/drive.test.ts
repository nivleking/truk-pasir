import { describe, expect, it } from 'vitest';
import { driveForces, isOutOfBounds } from '../../src/core/drive';

const cfg = { engineForce: 100, brakeForce: 10, coastBrake: 2, reverseFactor: 0.4 };
const cmd = (throttle: number, handbrake = false) => ({ throttle, steer: 0, handbrake });

describe('driveForces', () => {
  it('applies engine force forward when pressing W', () => {
    expect(driveForces(cmd(1), 0, cfg)).toEqual({ engine: 100, brake: 0 });
  });

  it('coasts to a stop with a light brake when no key is held', () => {
    expect(driveForces(cmd(0), 30, cfg)).toEqual({ engine: 0, brake: 2 });
  });

  it('S while moving forward brakes instead of reversing', () => {
    expect(driveForces(cmd(-1), 20, cfg)).toEqual({ engine: 0, brake: 10 });
  });

  it('S when (almost) stopped reverses with reduced power', () => {
    expect(driveForces(cmd(-1), 0.5, cfg)).toEqual({ engine: -40, brake: 0 });
  });

  it('W while rolling backward brakes first', () => {
    expect(driveForces(cmd(1), -10, cfg)).toEqual({ engine: 0, brake: 10 });
  });

  it('handbrake overrides everything', () => {
    expect(driveForces(cmd(1, true), 20, cfg)).toEqual({ engine: 0, brake: 10 });
  });
});

describe('isOutOfBounds', () => {
  it('is false on the map', () => {
    expect(isOutOfBounds({ x: 10, y: 1, z: -20 })).toBe(false);
  });

  it('is true after falling below the ground', () => {
    expect(isOutOfBounds({ x: 0, y: -6, z: 0 })).toBe(true);
  });
});
