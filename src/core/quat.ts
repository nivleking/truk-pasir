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

/** Hamilton product a * b (apply b first, then a). */
export function mulQuat(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function axisAngle(axis: 'x' | 'y' | 'z', rad: number): Quat {
  const s = Math.sin(rad / 2);
  return { x: axis === 'x' ? s : 0, y: axis === 'y' ? s : 0, z: axis === 'z' ? s : 0, w: Math.cos(rad / 2) };
}
