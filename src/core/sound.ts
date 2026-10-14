/** Engine note: low rumble at idle, rising with speed, louder when the throttle is pressed. */
export function engineTone(speedKmh: number, throttle: number): { freq: number; gain: number } {
  const speed = Math.min(Math.abs(speedKmh), 60);
  const load = Math.min(Math.abs(throttle), 1);
  return {
    freq: Math.min(220, 38 + speed * 2.2 + load * 18),
    gain: Math.min(0.5, 0.08 + load * 0.12 + speed * 0.002),
  };
}

/** Loudness of pouring sand from the number of grains currently moving fast. */
export function sandHiss(movingGrains: number): number {
  return movingGrains <= 0 ? 0 : Math.min(0.4, 0.05 + movingGrains * 0.002);
}
