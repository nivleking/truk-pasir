import { describe, it, expect } from 'vitest';
import { engineTone, sandHiss } from '../../src/core/sound';

describe('engineTone', () => {
  it('idles low and quiet, revs higher and louder with speed and throttle', () => {
    const idle = engineTone(0, 0);
    const rev = engineTone(30, 1);
    expect(idle.freq).toBeGreaterThan(20);
    expect(rev.freq).toBeGreaterThan(idle.freq);
    expect(rev.gain).toBeGreaterThan(idle.gain);
  });
  it('stays within sane limits at absurd speeds', () => {
    const t = engineTone(500, 1);
    expect(t.freq).toBeLessThanOrEqual(220);
    expect(t.gain).toBeLessThanOrEqual(0.5);
  });
  it('treats reverse like forward', () => {
    expect(engineTone(-20, -1)).toEqual(engineTone(20, 1));
  });
});

describe('sandHiss', () => {
  it('is silent with nothing moving and saturates with many grains', () => {
    expect(sandHiss(0)).toBe(0);
    expect(sandHiss(20)).toBeGreaterThan(0);
    expect(sandHiss(10000)).toBeLessThanOrEqual(0.4);
  });
});
