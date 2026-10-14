export type BedState = 'down' | 'raising' | 'holding' | 'lowering' | 'up';

export interface DumpBedConfig {
  /** Degrees */
  maxAngle: number;
  /** Degrees per second while a key is held */
  speed: number;
}

export interface DumpBed {
  readonly angle: number;
  readonly state: BedState;
  /** input: 1 raise, -1 lower, 0 hold */
  update(dt: number, input: number): void;
  isDumping(thresholdDeg: number): boolean;
}

export function createDumpBed(cfg: DumpBedConfig): DumpBed {
  let angle = 0;
  let state: BedState = 'down';

  return {
    get angle() {
      return angle;
    },
    get state() {
      return state;
    },
    update(dt, input) {
      angle = Math.min(cfg.maxAngle, Math.max(0, angle + Math.sign(input) * cfg.speed * dt));
      if (angle === 0) state = 'down';
      else if (angle === cfg.maxAngle) state = 'up';
      else if (input > 0) state = 'raising';
      else if (input < 0) state = 'lowering';
      else state = 'holding';
    },
    isDumping(thresholdDeg) {
      return angle >= thresholdDeg;
    },
  };
}
