export type BedState = 'down' | 'raising' | 'holding' | 'lowering' | 'up';

export interface DumpBedConfig {
  /** Degrees, default 0. The bed starts here. */
  minAngle?: number;
  /** Degrees */
  maxAngle: number;
  /** Degrees per second while a key is held */
  speed: number;
  /** Degrees to start at (default minAngle). */
  start?: number;
}

export interface DumpBed {
  readonly angle: number;
  readonly state: BedState;
  /** input: 1 raise, -1 lower, 0 hold */
  update(dt: number, input: number): void;
  isDumping(thresholdDeg: number): boolean;
  /** Back to the start angle. */
  reset(): void;
}

export function createDumpBed(cfg: DumpBedConfig): DumpBed {
  const min = cfg.minAngle ?? 0;
  const startAngle = Math.min(cfg.maxAngle, Math.max(min, cfg.start ?? min));
  let angle = startAngle;
  const stateAt = (a: number): BedState => (a === min ? 'down' : a === cfg.maxAngle ? 'up' : 'holding');
  let state: BedState = stateAt(angle);

  return {
    get angle() {
      return angle;
    },
    get state() {
      return state;
    },
    update(dt, input) {
      angle = Math.min(cfg.maxAngle, Math.max(min, angle + Math.sign(input) * cfg.speed * dt));
      if (angle === min) state = 'down';
      else if (angle === cfg.maxAngle) state = 'up';
      else if (input > 0) state = 'raising';
      else if (input < 0) state = 'lowering';
      else state = 'holding';
    },
    isDumping(thresholdDeg) {
      return angle >= thresholdDeg;
    },
    reset() {
      angle = startAngle;
      state = stateAt(angle);
    },
  };
}
