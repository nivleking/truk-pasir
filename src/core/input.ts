/** Player intent for one frame, independent of keyboard/gamepad. */
export interface DriveCommands {
  /** -1 (reverse) .. 1 (forward) */
  throttle: number;
  /** -1 (right) .. 1 (left) */
  steer: number;
  handbrake: boolean;
  /** 1 raise bed, -1 lower, 0 hold */
  bed: number;
}

const has = (keys: ReadonlySet<string>, ...codes: string[]) => codes.some((c) => keys.has(c));

/** Map currently held KeyboardEvent.code values to drive commands. */
export function commandsFromKeys(keys: ReadonlySet<string>): DriveCommands {
  const forward = has(keys, 'KeyW', 'ArrowUp') ? 1 : 0;
  const back = has(keys, 'KeyS', 'ArrowDown') ? 1 : 0;
  const left = has(keys, 'KeyA', 'ArrowLeft') ? 1 : 0;
  const right = has(keys, 'KeyD', 'ArrowRight') ? 1 : 0;
  return {
    throttle: forward - back,
    steer: left - right,
    handbrake: keys.has('Space'),
    bed: (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0),
  };
}

/** Move current steering toward target at `rate` units/second, so wheels turn gradually like a heavy truck. */
export function smoothSteer(current: number, target: number, dt: number, rate: number): number {
  const maxDelta = rate * dt;
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}
