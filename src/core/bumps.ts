export interface Bump {
  x: number;
  z: number;
  /** Radius of the buried sphere; bigger = wider, taller bump. */
  radius: number;
}

export interface BumpOptions {
  seed: number;
  count: number;
  from: { x: number; z: number };
  to: { x: number; z: number };
  corridorHalfWidth: number;
  keepClear: { x: number; z: number; radius: number }[];
}

/** Small deterministic PRNG (Park-Miller) so the road is the same every game. */
function prng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Scatter bumps along the corridor between `from` and `to`, avoiding the keep-clear circles. */
export function generateBumps(o: BumpOptions): Bump[] {
  const rand = prng(o.seed);
  const dx = o.to.x - o.from.x;
  const dz = o.to.z - o.from.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  const bumps: Bump[] = [];

  for (let tries = 0; bumps.length < o.count && tries < o.count * 50; tries++) {
    const along = rand() * len;
    const side = (rand() * 2 - 1) * o.corridorHalfWidth;
    const x = o.from.x + ux * along - uz * side;
    const z = o.from.z + uz * along + ux * side;
    if (o.keepClear.some((c) => Math.hypot(x - c.x, z - c.z) <= c.radius)) continue;
    bumps.push({ x, z, radius: 0.8 + rand() * 0.8 });
  }
  return bumps;
}
