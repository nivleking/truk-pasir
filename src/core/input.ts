/** Player intent for one frame, independent of keyboard/gamepad. */
export interface DriveCommands {
  /** -1 (reverse) .. 1 (forward) */
  throttle: number;
  /** -1 (right) .. 1 (left) */
  steer: number;
  handbrake: boolean;
  /** 1 raise bed, -1 lower, 0 hold */
  bed: number;
  /** Loader bucket: 1 tilt forward (dump), -1 tilt back, 0 hold */
  tilt: number;
  /** Excavator house: 1 swing left, -1 right */
  swing: number;
  /** Excavator stick: 1 reach out, -1 pull in */
  stick: number;
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
    tilt: (keys.has('KeyX') ? 1 : 0) - (keys.has('KeyZ') ? 1 : 0),
    swing: (keys.has('KeyJ') ? 1 : 0) - (keys.has('KeyL') ? 1 : 0),
    stick: (keys.has('KeyI') ? 1 : 0) - (keys.has('KeyK') ? 1 : 0),
  };
}

/** Move current steering toward target at `rate` units/second, so wheels turn gradually like a heavy truck. */
export function smoothSteer(current: number, target: number, dt: number, rate: number): number {
  const maxDelta = rate * dt;
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}
