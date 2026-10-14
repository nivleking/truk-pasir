import type { BedState } from './dumpBed';

/** Degrees to add to the bed angle: a quick wobble while raise is held at the top, to knock stuck sand loose. */
export function shakeOffset(time: number, state: BedState, input: number, amplitude = 4, hz = 6): number {
  if (state !== 'up' || input <= 0) return 0;
  return -amplitude * Math.abs(Math.sin(time * hz * Math.PI));
}
