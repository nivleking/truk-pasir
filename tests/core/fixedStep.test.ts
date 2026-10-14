import { describe, expect, it } from 'vitest';
import { createFixedStep } from '../../src/core/fixedStep';

describe('fixedStep', () => {
  it('runs no step when less than one step of time has passed', () => {
    const loop = createFixedStep(1 / 60);
    expect(loop.advance(0.01)).toBe(0);
  });

  it('runs one step for exactly one step of time', () => {
    const loop = createFixedStep(1 / 60);
    expect(loop.advance(1 / 60)).toBe(1);
  });

  it('accumulates leftover time across frames', () => {
    const loop = createFixedStep(0.1);
    expect(loop.advance(0.15)).toBe(1);
    expect(loop.advance(0.06)).toBe(1);
  });

  it('caps steps per frame so a long pause does not freeze the game', () => {
    const loop = createFixedStep(1 / 60, 5);
    expect(loop.advance(10)).toBe(5);
    expect(loop.advance(0)).toBe(0);
  });

  it('reports interpolation alpha between 0 and 1', () => {
    const loop = createFixedStep(0.1);
    loop.advance(0.125);
    expect(loop.alpha()).toBeCloseTo(0.25);
  });
});
