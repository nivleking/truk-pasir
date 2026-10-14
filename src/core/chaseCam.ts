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
