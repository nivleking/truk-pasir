import type { Vec3 } from './chaseCam';

/** Horizontal distance check: is `bed` within `radius` of the hopper's spout? */
export function isUnder(bed: Vec3, hopper: Vec3, radius: number): boolean {
  return Math.hypot(bed.x - hopper.x, bed.z - hopper.z) <= radius;
}

export interface HopperConfig {
  /** Grains per second */
  rate: number;
  /** Grains per load */
  capacity: number;
}

export interface Hopper {
  readonly loaded: number;
  /** Returns how many grains to spawn this frame. */
  update(dt: number, bedUnder: boolean): number;
}

export function createHopper(cfg: HopperConfig): Hopper {
  let loaded = 0;
  let pending = 0;

  return {
    get loaded() {
      return loaded;
    },
    update(dt, bedUnder) {
      if (!bedUnder) {
        loaded = 0;
        pending = 0;
        return 0;
      }
      pending += cfg.rate * dt;
      const n = Math.min(Math.floor(pending + 1e-9), cfg.capacity - loaded);
      pending -= n;
      loaded += n;
      return n;
    },
  };
}
