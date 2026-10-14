import { describe, expect, it } from 'vitest';
import { createRound, type RoundInput } from '../../src/core/round';

const base: RoundInput = { loaded: 0, delivered: 0, bedUnderHopper: false, bedInZone: false, bedAngle: 0 };
const step = (r: ReturnType<typeof createRound>, dt: number, over: Partial<RoundInput>) => r.update(dt, { ...base, ...over });

describe('round', () => {
  it('starts ready with the timer stopped', () => {
    const r = createRound({ dumpAngle: 25, settleSeconds: 2 });
    step(r, 5, {});
    expect(r.state).toBe('ready');
    expect(r.seconds).toBe(0);
  });

  it('starts loading and the timer when sand arrives', () => {
    const r = createRound({ dumpAngle: 25, settleSeconds: 2 });
    step(r, 1, { loaded: 3, bedUnderHopper: true });
    expect(r.state).toBe('loading');
    expect(r.seconds).toBe(1);
  });

  it('is hauling once the loaded truck leaves the hopper', () => {
    const r = createRound({ dumpAngle: 25, settleSeconds: 2 });
    step(r, 1, { loaded: 100, bedUnderHopper: true });
    step(r, 1, { loaded: 100 });
    expect(r.state).toBe('hauling');
  });

  it('only counts as dumping with the bed raised inside the zone', () => {
    const r = createRound({ dumpAngle: 25, settleSeconds: 2 });
    step(r, 1, { loaded: 100, bedUnderHopper: true });
    step(r, 1, { loaded: 100, bedAngle: 40 });
    expect(r.state).toBe('hauling');
    step(r, 1, { loaded: 100, bedAngle: 40, bedInZone: true });
    expect(r.state).toBe('dumping');
  });

  it('settles briefly after the bed is lowered, then freezes the result', () => {
    const r = createRound({ dumpAngle: 25, settleSeconds: 2 });
    step(r, 1, { loaded: 100, bedUnderHopper: true });
    step(r, 10, { loaded: 100 });
    step(r, 2, { loaded: 100, bedAngle: 40, bedInZone: true, delivered: 70 });
    step(r, 1, { loaded: 100, bedAngle: 0, bedInZone: true, delivered: 80 });
    expect(r.state).toBe('settling');
    step(r, 2, { loaded: 100, bedAngle: 0, delivered: 85 });
    expect(r.state).toBe('finished');
    expect(r.seconds).toBe(14);
    expect(r.result?.percent).toBe(85);

    step(r, 10, { loaded: 100, delivered: 99 });
    expect(r.seconds).toBe(14);
    expect(r.result?.percent).toBe(85);
  });

  it('raising the bed again while settling goes back to dumping', () => {
    const r = createRound({ dumpAngle: 25, settleSeconds: 2 });
    step(r, 1, { loaded: 100, bedUnderHopper: true });
    step(r, 1, { loaded: 100 });
    step(r, 1, { loaded: 100, bedAngle: 40, bedInZone: true });
    step(r, 0.5, { loaded: 100, bedAngle: 0, bedInZone: true });
    step(r, 0.5, { loaded: 100, bedAngle: 30, bedInZone: true });
    expect(r.state).toBe('dumping');
  });

  it('reset goes back to ready', () => {
    const r = createRound({ dumpAngle: 25, settleSeconds: 2 });
    step(r, 1, { loaded: 5, bedUnderHopper: true });
    r.reset();
    expect(r.state).toBe('ready');
    expect(r.seconds).toBe(0);
    expect(r.result).toBeNull();
  });
});
