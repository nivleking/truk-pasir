import type { Vec3 } from './chaseCam';

export interface Quat extends Vec3 {
  w: number;
}

/** Rotate vector v by unit quaternion q. */
export function rotateByQuat(v: Vec3, q: Quat): Vec3 {
  // t = 2 * cross(q.xyz, v); v' = v + w * t + cross(q.xyz, t)
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/** Rotation: tilt `tiltDeg` around X (positive raises the +Z end), then yaw `yawDeg` around Y. */
export function yawTiltQuat(yawDeg: number, tiltDeg: number): Quat {
  const y = (yawDeg * Math.PI) / 360;
  const t = (-tiltDeg * Math.PI) / 360;
  const [sy, cy, st, ct] = [Math.sin(y), Math.cos(y), Math.sin(t), Math.cos(t)];
  // qYaw * qTilt
  return { x: cy * st, y: sy * ct, z: -sy * st, w: cy * ct };
}
