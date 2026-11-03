import type { Vec3 } from './chaseCam';

export interface TrackSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  /** Ground height under the segment. */
  y: number;
  width: number;
}

/**
 * Tire marks: each wheel lays a segment every `step` meters while it touches the ground.
 * Only the newest `capacity` segments are kept; `version` changes whenever the list does.
 */
export function createTireTracks(capacity: number, step: number) {
  const segments: TrackSegment[] = [];
  const last = new Map<number, Vec3>();
  let version = 0;
  return {
    segments,
    get version() {
      return version;
    },
    touch(wheel: number, at: Vec3, width: number) {
      const prev = last.get(wheel);
      if (!prev) {
        last.set(wheel, { ...at });
        return;
      }
      if (Math.hypot(at.x - prev.x, at.z - prev.z) < step) return;
      segments.push({ ax: prev.x, az: prev.z, bx: at.x, bz: at.z, y: Math.max(prev.y, at.y), width });
      if (segments.length > capacity) segments.shift();
      last.set(wheel, { ...at });
      version++;
    },
    lift(wheel: number) {
      last.delete(wheel);
    },
    clear() {
      segments.length = 0;
      last.clear();
      version++;
    },
  };
}
