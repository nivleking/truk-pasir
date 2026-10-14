import { describe, expect, it } from 'vitest';
import { commandsFromKeys, smoothSteer } from '../../src/core/input';

const keys = (...k: string[]) => new Set(k);

describe('commandsFromKeys', () => {
  it('is idle with no keys', () => {
    expect(commandsFromKeys(keys())).toEqual({ throttle: 0, steer: 0, handbrake: false });
  });

  it('W accelerates, S reverses', () => {
    expect(commandsFromKeys(keys('KeyW')).throttle).toBe(1);
    expect(commandsFromKeys(keys('KeyS')).throttle).toBe(-1);
  });

  it('W and S together cancel out', () => {
    expect(commandsFromKeys(keys('KeyW', 'KeyS')).throttle).toBe(0);
  });

  it('A steers left (+1), D steers right (-1)', () => {
    expect(commandsFromKeys(keys('KeyA')).steer).toBe(1);
    expect(commandsFromKeys(keys('KeyD')).steer).toBe(-1);
  });

  it('arrow keys work like WASD', () => {
    expect(commandsFromKeys(keys('ArrowUp', 'ArrowLeft'))).toMatchObject({ throttle: 1, steer: 1 });
  });

  it('Space is the handbrake', () => {
    expect(commandsFromKeys(keys('Space')).handbrake).toBe(true);
  });
});

describe('smoothSteer', () => {
  it('moves toward the target by at most rate*dt', () => {
    expect(smoothSteer(0, 1, 0.1, 2)).toBeCloseTo(0.2);
  });

  it('does not overshoot the target', () => {
    expect(smoothSteer(0.9, 1, 0.1, 2)).toBe(1);
  });

  it('returns to center when target is 0', () => {
    expect(smoothSteer(-0.5, 0, 0.1, 2)).toBeCloseTo(-0.3);
  });
});
