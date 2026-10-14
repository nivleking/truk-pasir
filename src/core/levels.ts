export interface Point {
  x: number;
  z: number;
}

/** Static obstacle. wall/cone are upright boxes; ramp is a box tilted `tilt` degrees about its local X (a wedge). */
export interface Obstacle {
  kind: 'wall' | 'cone' | 'ramp';
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Height for wall/cone, thickness for ramp. */
  h: number;
  /** Degrees around Y */
  yaw?: number;
  /** Degrees around local X, ramps only (positive = rises toward +Z). */
  tilt?: number;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  spawn: Point;
  hopper: Point;
  /** Center of the dump pit. */
  pit: Point;
  bumps: { seed: number; count: number; corridorHalfWidth: number };
  obstacles: Obstacle[];
  /** Seconds for the third star. */
  targetSeconds: number;
}

/** Dump pit: sand that falls in cannot roll out. Curbs stop the wheels at the edge. */
export const PIT = { half: 4, depth: 1.6, curbHeight: 1.1, curbWidth: 0.4 } as const;

const wall = (x: number, z: number, hx: number, hz: number, yaw = 0): Obstacle => ({ kind: 'wall', x, z, hx, hz, h: 1.2, yaw });
const cone = (x: number, z: number): Obstacle => ({ kind: 'cone', x, z, hx: 0.25, hz: 0.25, h: 0.7 });
/** A hump: ramp up then ramp down, centered at (x, z), driven along Z. */
const hump = (x: number, z: number, halfWidth: number, tiltDeg = 10): Obstacle[] => [
  { kind: 'ramp', x, z: z - 2.9, hx: halfWidth, hz: 3, h: 0.3, tilt: tiltDeg },
  { kind: 'ramp', x, z: z + 2.9, hx: halfWidth, hz: 3, h: 0.3, tilt: -tiltDeg },
];

export const LEVELS: readonly Level[] = [
  {
    id: 'latihan',
    name: '1. Training',
    description: 'A straight road with a few bumps. Get to know your truck.',
    spawn: { x: 0, z: 0 },
    hopper: { x: 0, z: 22 },
    pit: { x: 26, z: -20 },
    bumps: { seed: 2026, count: 20, corridorHalfWidth: 8 },
    obstacles: [],
    targetSeconds: 60,
  },
  {
    id: 'slalom',
    name: '2. Slalom',
    description: 'Zig-zag concrete walls and cones on the road. Mind your load.',
    spawn: { x: -35, z: -42 },
    hopper: { x: -35, z: -20 },
    pit: { x: 35, z: 40 },
    bumps: { seed: 77, count: 30, corridorHalfWidth: 10 },
    obstacles: [
      wall(-22, -2, 6, 0.3, 45),
      wall(-6, 2, 6, 0.3, -45),
      wall(6, 18, 6, 0.3, 45),
      wall(20, 22, 6, 0.3, -45),
      cone(-14, 4),
      cone(-12, 6),
      cone(0, 12),
      cone(2, 14),
      cone(13, 26),
      cone(15, 28),
    ],
    targetSeconds: 90,
  },
  {
    id: 'tambang',
    name: '3. Mine',
    description: 'Squeeze through the gap in the mine wall, over speed humps and lots of bumps.',
    spawn: { x: 40, z: -42 },
    hopper: { x: 40, z: -20 },
    pit: { x: -35, z: 40 },
    bumps: { seed: 4242, count: 55, corridorHalfWidth: 12 },
    obstacles: [
      // Mine wall across the map with one 8 m gap in the middle.
      ...[10, 22, 34, 46].flatMap((x) => [wall(x, 10, 6, 0.6), wall(-x, 10, 6, 0.6)]),
      wall(55.5, 10, 4, 0.6),
      wall(-55.5, 10, 4, 0.6),
      ...hump(0, -2, 4),
      ...hump(-12, 26, 4),
      cone(-3.5, 14),
      cone(3.5, 14),
    ],
    targetSeconds: 120,
  },
];

export function findLevel(id: string | null): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]!;
}

/** 1 star: half the sand delivered. 2: three quarters. 3: 90% and within the level's target time. */
export function starsFor(level: Pick<Level, 'targetSeconds'>, percent: number, seconds: number): number {
  if (percent >= 90 && seconds <= level.targetSeconds) return 3;
  if (percent >= 75) return 2;
  if (percent >= 50) return 1;
  return 0;
}

/** Best stars per level id. */
export type Progress = Record<string, number>;

export function isUnlocked(index: number, progress: Progress): boolean {
  if (index <= 0) return true;
  const prev = LEVELS[index - 1];
  return !!prev && (progress[prev.id] ?? 0) >= 1;
}

export function recordStars(progress: Progress, id: string, stars: number): Progress {
  return { ...progress, [id]: Math.max(progress[id] ?? 0, stars) };
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
    const out: Progress = {};
    for (const [k, v] of Object.entries(data)) if (typeof v === 'number' && v >= 0 && v <= 3) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export interface GroundBox {
  part: 'ground' | 'floor' | 'wall' | 'curb';
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
}

/** Ground slab (top at y=0) with a square hole for the dump pit, plus its floor, walls and curbs. */
export function groundBoxes(pit: Point, half: number): GroundBox[] {
  const P = PIT.half;
  const d = PIT.depth;
  const t = 0.1;
  const { x, z } = pit;
  const g = (bx: number, bz: number, hx: number, hz: number): GroundBox => ({ part: 'ground', x: bx, y: -t, z: bz, hx, hy: t, hz });
  const north = (half - (z + P)) / 2;
  const south = (z - P + half) / 2;
  const west = (x - P + half) / 2;
  const east = (half - (x + P)) / 2;
  const c = PIT.curbWidth / 2;
  const ch = PIT.curbHeight / 2;
  return [
    g(0, z + P + north, half, north),
    g(0, z - P - south, half, south),
    g(x - P - west, z, west, P),
    g(x + P + east, z, east, P),
    { part: 'floor', x, y: -d - t, z, hx: P + t, hy: t, hz: P + t },
    { part: 'wall', x, y: -d / 2, z: z + P + t / 2, hx: P, hy: d / 2, hz: t / 2 },
    { part: 'wall', x, y: -d / 2, z: z - P - t / 2, hx: P, hy: d / 2, hz: t / 2 },
    { part: 'wall', x: x + P + t / 2, y: -d / 2, z, hx: t / 2, hy: d / 2, hz: P },
    { part: 'wall', x: x - P - t / 2, y: -d / 2, z, hx: t / 2, hy: d / 2, hz: P },
    { part: 'curb', x, y: ch, z: z + P + c, hx: P + 2 * c, hy: ch, hz: c },
    { part: 'curb', x, y: ch, z: z - P - c, hx: P + 2 * c, hy: ch, hz: c },
    { part: 'curb', x: x + P + c, y: ch, z, hx: c, hy: ch, hz: P },
    { part: 'curb', x: x - P - c, y: ch, z, hx: c, hy: ch, hz: P },
  ];
}

/** True when a grain has fallen into the pit. */
export function inPit(p: { x: number; y: number; z: number }, pit: Point): boolean {
  return p.y < 0 && Math.abs(p.x - pit.x) < PIT.half && Math.abs(p.z - pit.z) < PIT.half;
}
