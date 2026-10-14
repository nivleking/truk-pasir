export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Desired camera position: `distance` behind and `height` above a target heading `yaw` (0 = facing +Z). */
export function chaseOffset(target: Vec3, yaw: number, distance: number, height: number): Vec3 {
  return {
    x: target.x - Math.sin(yaw) * distance,
    y: target.y + height,
    z: target.z - Math.cos(yaw) * distance,
  };
}

/** Lerp factor for exponential smoothing that behaves the same at any FPS. */
export function followFactor(dt: number, sharpness: number): number {
  return 1 - Math.exp(-sharpness * dt);
}

/** Exponential smoothing for angles (radians) that wraps the short way around ±π. */
export function smoothAngle(current: number, target: number, factor: number): number {
  let delta = target - current;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return current + delta * factor;
}
