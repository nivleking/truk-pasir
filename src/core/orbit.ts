/** User look-around on top of the chase camera: yaw offset, lift (-0.6 low .. 1 overhead) and zoom. */
export interface Orbit {
  readonly yaw: number;
  readonly lift: number;
  readonly zoom: number;
  /** Mouse/touch drag in pixels. */
  drag(dx: number, dy: number): void;
  /** Wheel deltaY: positive zooms out. */
  wheel(deltaY: number): void;
  reset(): void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function createOrbit(sensitivity = 0.005): Orbit {
  let yaw = 0;
  let lift = 0;
  let zoom = 1;
  return {
    get yaw() {
      return yaw;
    },
    get lift() {
      return lift;
    },
    get zoom() {
      return zoom;
    },
    drag(dx, dy) {
      yaw = Math.atan2(Math.sin(yaw - dx * sensitivity), Math.cos(yaw - dx * sensitivity));
      lift = clamp(lift - dy * sensitivity, -0.6, 1);
    },
    wheel(deltaY) {
      zoom = clamp(zoom * Math.exp(deltaY * 0.001), 0.5, 2.5);
    },
    reset() {
      yaw = 0;
      lift = 0;
      zoom = 1;
    },
  };
}
