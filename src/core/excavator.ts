import type { Vec3 } from './chaseCam';
import { axisAngle, mulQuat, rotateByQuat, type Quat } from './quat';

export interface ExcavatorRig {
  /** House swing pivot, chassis-local. */
  housePivot: Vec3;
  /** Boom foot, house-local. */
  boomPivot: Vec3;
  boomLength: number;
  stickLength: number;
}

/**
 * Joint angles in degrees. boom: up from horizontal. stick: folded down relative to the boom.
 * bucket: tilt relative to the house, not the stick (self-levelling, like the loader), so a full bucket
 * stays full while the boom and stick move. Positive tips the bucket's +Z end down.
 */
export interface ExcavatorPose {
  swing: number;
  boom: number;
  stick: number;
  bucket: number;
}

export interface LinkPose {
  pos: Vec3;
  rot: Quat;
}

const rad = (d: number) => (d * Math.PI) / 180;
const addV = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

/**
 * Forward kinematics: world pose of each link's pivot (house, boom, stick, bucket) from the chassis pose.
 * Rotation about +X tips a link's +Z end down, so the boom uses -boom to rise.
 */
export function excavatorLinks(chassisPos: Vec3, chassisRot: Quat, rig: ExcavatorRig, p: ExcavatorPose) {
  const houseRot = mulQuat(chassisRot, axisAngle('y', rad(p.swing)));
  const house = { pos: addV(chassisPos, rotateByQuat(rig.housePivot, chassisRot)), rot: houseRot };
  const boomRot = mulQuat(houseRot, axisAngle('x', -rad(p.boom)));
  const boom = { pos: addV(house.pos, rotateByQuat(rig.boomPivot, houseRot)), rot: boomRot };
  const stickRot = mulQuat(boomRot, axisAngle('x', rad(p.stick)));
  const stick = { pos: addV(boom.pos, rotateByQuat({ x: 0, y: 0, z: rig.boomLength }, boomRot)), rot: stickRot };
  const bucketRot = mulQuat(houseRot, axisAngle('x', rad(p.bucket)));
  const bucket = { pos: addV(stick.pos, rotateByQuat({ x: 0, y: 0, z: rig.stickLength }, stickRot)), rot: bucketRot };
  return { house, boom, stick, bucket };
}

/** Grain centers for a heap: stacked rings that shrink with height, no two grains overlapping. */
export function pileGrains(center: { x: number; z: number }, count: number, grainRadius: number, baseRadius: number): Vec3[] {
  const out: Vec3[] = [];
  const step = grainRadius * 2.05;
  for (let layer = 0; out.length < count && layer < 200; layer++) {
    const r = baseRadius * Math.max(0.3, 1 - layer * 0.12);
    const y = grainRadius + layer * step * 0.95;
    for (let gx = -r; gx <= r && out.length < count; gx += step)
      for (let gz = -r; gz <= r && out.length < count; gz += step)
        if (gx * gx + gz * gz <= r * r) out.push({ x: center.x + gx + (layer % 2) * step * 0.25, y, z: center.z + gz });
  }
  return out;
}

/** Lowest world Y of a bucket hanging from its pivot: box ±halfWidth wide, `height` down and `depth` back (toward the machine). */
export function bucketLowestY(link: LinkPose, halfWidth: number, depth: number, height: number): number {
  let low = Infinity;
  for (const x of [-halfWidth, halfWidth])
    for (const y of [0, -height])
      for (const z of [0, -depth]) low = Math.min(low, link.pos.y + rotateByQuat({ x, y, z }, link.rot).y);
  return low;
}

export interface Wall {
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
}

/**
 * Excavator job layout around the level's hopper spot: a sand pile in a three-sided concrete bay
 * (open toward the excavator so the pile does not roll away), the excavator facing it, and the truck
 * parked on the excavator's left, in reach of a 90° swing.
 */
export function digSite(at: { x: number; z: number }) {
  const pile = { x: at.x - 3, z: at.z + 7.2 };
  const half = 1.05;
  const t = 0.25;
  const h = 1.3;
  const walls: Wall[] = [
    { x: pile.x, z: pile.z + half + t, hx: half + 2 * t, hz: t, h },
    { x: pile.x - half - t, z: pile.z, hx: t, hz: half, h },
    { x: pile.x + half + t, z: pile.z, hx: t, hz: half, h },
  ];
  return {
    pile,
    pileRadius: 1.0,
    /** Grains in the pile: about six good scoops. */
    pileCount: 240,
    excavator: { x: at.x - 3, z: at.z + 2 },
    truck: { x: at.x + 2.6, z: at.z + 5 },
    walls,
  };
}
