import { generateBumps, type Bump } from './bumps';

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
  /** Generated side wall of a track (see trackWalls). */
  track?: boolean;
}

/** A closed road: walls on both sides of the polyline and across both ends, so there is no shortcut. */
export interface Track {
  points: Point[];
  halfWidth: number;
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
  track?: Track;
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
  },  {
    id: 'slalom',
    name: '2. Slalom',
    description: 'A walled road with barriers sticking out from alternate sides. No shortcuts: weave through.',
    spawn: { x: -40, z: -44 },
    hopper: { x: -40, z: -24 },
    pit: { x: 36, z: 45 },
    track: { points: [{ x: -40, z: -53 }, { x: -40, z: 5 }, { x: 5, z: 5 }, { x: 5, z: 45 }, { x: 48, z: 45 }], halfWidth: 7 },
    bumps: { seed: 77, count: 18, corridorHalfWidth: 5 },
    obstacles: [
      // Barriers that close half the road, alternating sides.
      wall(-28, 8.5, 0.3, 3.5),
      wall(-18, 1.5, 0.3, 3.5),
      wall(-8, 8.5, 0.3, 3.5),
      wall(1.5, 16, 3.5, 0.3),
      wall(8.5, 25, 3.5, 0.3),
      wall(1.5, 34, 3.5, 0.3),
      cone(-23, 5),
      cone(-13, 5),
      cone(5, 20.5),
      cone(5, 29.5),
      cone(18, 45),
      cone(22, 42),
    ],
    targetSeconds: 100,
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
  },  {
    id: 'canyon',
    name: '4. Canyon',
    description: 'A narrow zig-zag canyon with a full-width hump. Tight corners for big trucks.',
    spawn: { x: 45, z: -48 },
    hopper: { x: 45, z: -32 },
    pit: { x: -40, z: 40 },
    track: {
      points: [{ x: 45, z: -56 }, { x: 45, z: -20 }, { x: 15, z: -20 }, { x: 15, z: 10 }, { x: -15, z: 10 }, { x: -15, z: 40 }, { x: -50, z: 40 }],
      halfWidth: 6,
    },
    bumps: { seed: 31, count: 22, corridorHalfWidth: 4 },
    obstacles: [...hump(15, -5, 6), cone(0, 7), cone(-5, 13), cone(-15, 25), cone(-12, 30), cone(-25, 40)],
    targetSeconds: 110,
  },
  {
    id: 'ridge',
    name: '5. Ridge Run',
    description: 'A long U-shaped haul over hump after hump. Keep the load steady.',
    spawn: { x: -45, z: -46 },
    hopper: { x: -45, z: -28 },
    pit: { x: 40, z: 28 },
    track: {
      points: [{ x: -45, z: -56 }, { x: -45, z: 45 }, { x: 0, z: 45 }, { x: 0, z: -45 }, { x: 40, z: -45 }, { x: 40, z: 40 }],
      halfWidth: 7,
    },
    bumps: { seed: 909, count: 35, corridorHalfWidth: 5 },
    obstacles: [
      ...hump(-45, 5, 7),
      ...hump(-45, 28, 7, 13),
      ...hump(0, 20, 7),
      ...hump(0, -5, 7, 13),
      ...hump(0, -28, 7),
      ...hump(40, -20, 7, 13),
      ...hump(40, 3, 7),
      cone(15, -42),
      cone(25, -48),
    ],
    targetSeconds: 160,
  },
  {
    id: 'long-haul',
    name: '6. Long Haul',
    description: 'A serpentine road across the whole quarry. The real test: speed without spilling.',
    spawn: { x: -50, z: -46 },
    hopper: { x: -50, z: -32 },
    pit: { x: 50, z: 18 },
    track: {
      points: [
        { x: -50, z: -56 }, { x: -50, z: 48 }, { x: -25, z: 48 }, { x: -25, z: -48 }, { x: 0, z: -48 },
        { x: 0, z: 48 }, { x: 25, z: 48 }, { x: 25, z: -48 }, { x: 50, z: -48 }, { x: 50, z: 30 },
      ],
      halfWidth: 6,
    },
    bumps: { seed: 5150, count: 50, corridorHalfWidth: 4 },
    obstacles: [
      wall(-22, 20, 3, 0.3),
      wall(-28, 0, 3, 0.3),
      wall(-22, -20, 3, 0.3),
      ...hump(0, 0, 6, 12),
      wall(28, 20, 3, 0.3),
      wall(22, 0, 3, 0.3),
      wall(28, -20, 3, 0.3),
      cone(-50, 10),
      cone(-47, 25),
      cone(50, -20),
      cone(47, -5),
    ],
    targetSeconds: 240,
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

const WALL_HALF_THICK = 0.3;

/** Distance from p to the segment a-b on the ground plane. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

export const distToTrack = (p: Point, t: Track) =>
  Math.min(...t.points.slice(1).map((b, i) => distToSegment(p, t.points[i]!, b)));

/** A wall box spanning a-b. Box local X runs along the wall; yaw follows yawTiltQuat (yaw 90 turns +Z toward +X). */
function wallBetween(a: Point, b: Point): Obstacle {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return {
    kind: 'wall',
    track: true,
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    hx: Math.hypot(dx, dz) / 2 + WALL_HALF_THICK,
    hz: WALL_HALF_THICK,
    h: 1.4,
    yaw: (Math.atan2(-dz, dx) * 180) / Math.PI,
  };
}

/** Offset polyline at signed distance d (left = +d), corners joined with miters. */
function offsetLine(pts: Point[], d: number): Point[] {
  const normal = (a: Point, b: Point) => {
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    return { x: -(b.z - a.z) / l, z: (b.x - a.x) / l };
  };
  return pts.map((p, i) => {
    const n0 = i > 0 ? normal(pts[i - 1]!, p) : null;
    const n1 = i < pts.length - 1 ? normal(p, pts[i + 1]!) : null;
    if (!n0 || !n1) {
      const n = (n0 ?? n1)!;
      return { x: p.x + n.x * d, z: p.z + n.z * d };
    }
    const mx = n0.x + n1.x;
    const mz = n0.z + n1.z;
    const scale = d / (1 + n0.x * n1.x + n0.z * n1.z);
    return { x: p.x + mx * scale, z: p.z + mz * scale };
  });
}

/** Side walls along both edges of the track plus a wall across each end. */
export function trackWalls(t: Track): Obstacle[] {
  const left = offsetLine(t.points, t.halfWidth);
  const right = offsetLine(t.points, -t.halfWidth);
  const walls: Obstacle[] = [];
  for (const side of [left, right]) for (let i = 1; i < side.length; i++) walls.push(wallBetween(side[i - 1]!, side[i]!));
  walls.push(wallBetween(left[0]!, right[0]!), wallBetween(left[left.length - 1]!, right[right.length - 1]!));
  return walls;
}

/** Hand-placed obstacles plus the generated track walls. */
export const levelObstacles = (l: Level): Obstacle[] => (l.track ? [...l.obstacles, ...trackWalls(l.track)] : l.obstacles);

/** Bumps: on a track they are scattered along each segment, inside the walls; otherwise between hopper and pit. */
export function levelBumps(l: Level): Bump[] {
  const keepClear = [
    { ...l.hopper, radius: 8 },
    { ...l.pit, radius: PIT.half + 6 },
    { ...l.spawn, radius: 12 },
    ...l.obstacles.map((o) => ({ x: o.x, z: o.z, radius: Math.hypot(o.hx, o.hz) + 2 })),
  ];
  if (!l.track) return generateBumps({ ...l.bumps, from: l.hopper, to: l.pit, keepClear });
  const segs = l.track.points.slice(1).map((b, i) => [l.track!.points[i]!, b] as const);
  const total = segs.reduce((s, [a, b]) => s + Math.hypot(b.x - a.x, b.z - a.z), 0);
  const halfWidth = Math.min(l.bumps.corridorHalfWidth, l.track.halfWidth - 2);
  return segs.flatMap(([a, b], i) =>
    generateBumps({
      seed: l.bumps.seed + i,
      count: Math.round((l.bumps.count * Math.hypot(b.x - a.x, b.z - a.z)) / total),
      from: a,
      to: b,
      corridorHalfWidth: halfWidth,
      keepClear,
    }),
  );
}
