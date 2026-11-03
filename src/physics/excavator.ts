import type RAPIER from '@dimforge/rapier3d-compat';
import { createDumpBed } from '../core/dumpBed';
import { bucketLowestY, excavatorLinks, type ExcavatorRig } from '../core/excavator';
import { rotateByQuat } from '../core/quat';
import type { VehicleInfo } from '../core/vehicles';
import { createChassis, type ChassisConfig } from './chassis';
import { createBoxBody, type Box } from './parts';
import type { CabSpec, Vehicle } from './vehicle';
import type { Rapier } from './world';

export interface ExcavatorConfig extends ExcavatorRig {
  bucketHalfWidth: number;
  bucketDepth: number;
  bucketHeight: number;
}

export const houseBoxes = (): Box[] => [
  { hx: 1.25, hy: 0.3, hz: 1.5, x: 0, y: 0.3, z: -0.2 }, // deck + engine
  { hx: 1.2, hy: 0.4, hz: 0.3, x: 0, y: 0.5, z: -1.65 }, // counterweight
  { hx: 0.48, hy: 0.7, hz: 0.6, x: 0.7, y: 1.3, z: 0.65 }, // cab, on the left like a real excavator
];
/**
 * Backhoe bucket hanging from its pivot: a box open only at the top (the mouth), reaching `depth` back
 * toward the machine. Teeth down, the mouth faces the machine and fills as the stick pulls in.
 * Thick walls, so grains squeezed against them while digging cannot pop through.
 */
export function backhoeBucketBoxes(c: { bucketHalfWidth: number; bucketDepth: number; bucketHeight: number }): Box[] {
  const w = c.bucketHalfWidth;
  const h = c.bucketHeight;
  const d = c.bucketDepth;
  const t = 0.12;
  return [
    { hx: w, hy: h / 2, hz: t, x: 0, y: -h / 2, z: -t }, // back plate under the pivot
    { hx: w, hy: t, hz: d / 2, x: 0, y: -h + t, z: -d / 2 }, // floor
    { hx: t, hy: h / 2, hz: d / 2, x: w - t, y: -h / 2, z: -d / 2 }, // sides
    { hx: t, hy: h / 2, hz: d / 2, x: -(w - t), y: -h / 2, z: -d / 2 },
    { hx: w, hy: h / 2, hz: t, x: 0, y: -h / 2, z: -d + t }, // front wall with the teeth
  ];
}
const boomBoxes = (c: ExcavatorConfig): Box[] => [{ hx: 0.18, hy: 0.26, hz: c.boomLength / 2, x: 0, y: 0, z: c.boomLength / 2 }];
const stickBoxes = (c: ExcavatorConfig): Box[] => [{ hx: 0.14, hy: 0.18, hz: c.stickLength / 2, x: 0, y: 0, z: c.stickLength / 2 }];

/** World Y the bucket's lowest corner may not go below. The ground is at 0: the bottom plate may sink in so the inside floor sits just above it and grains on the ground slide in. */
const GROUND_CLEARANCE = -0.22;
const BOOM_SPEED = 25;
/** How far in front of the mouth grains get drawn in while curling (m), and how fast (m/s). */
const SCOOP_REACH = 0.9;
const SCOOP_PULL = 2.5;

/**
 * Excavator: a tracked base that drives like the others, plus a house, boom, stick and bucket.
 * The arm links are kinematic bodies posed every step from the joint angles (forward kinematics):
 * rock steady, and they still shove sand grains around like real steel.
 */
export function createExcavator(
  rapier: Rapier,
  world: RAPIER.World,
  info: VehicleInfo,
  config: ChassisConfig,
  ec: ExcavatorConfig,
  cab: CabSpec,
): Vehicle {
  const chassis = createChassis(rapier, world, config);
  const bBoxes = backhoeBucketBoxes(ec);
  const kin = (boxes: Box[]) => createBoxBody(rapier, world, chassis.body.translation(), boxes, 1000, 0.8, true);
  const house = kin(houseBoxes());
  const boom = kin(boomBoxes(ec));
  const stick = kin(stickBoxes(ec));
  const bucket = kin(bBoxes);

  const swing = createDumpBed({ minAngle: -170, maxAngle: 170, speed: 45, start: 0 });
  const boomA = createDumpBed({ minAngle: -25, maxAngle: 55, speed: BOOM_SPEED, start: 50 });
  const stickA = createDumpBed({ minAngle: 30, maxAngle: 150, speed: 35, start: 120 });
  // Bucket tilt relative to the house: 0 holds a load level, about -90 is the digging pose, -160 empties it.
  const bucketA = createDumpBed({ minAngle: -160, maxAngle: 35, speed: 45, start: 0 });

  const links = () =>
    excavatorLinks(chassis.body.translation(), chassis.body.rotation(), ec, {
      swing: swing.angle,
      boom: boomA.angle,
      stick: stickA.angle,
      bucket: bucketA.angle,
    });
  const pose = (instant: boolean) => {
    const ls = links();
    for (const [body, l] of [
      [house, ls.house],
      [boom, ls.boom],
      [stick, ls.stick],
      [bucket, ls.bucket],
    ] as const) {
      if (instant) {
        body.setTranslation(l.pos, true);
        body.setRotation(l.rot, true);
      } else {
        body.setNextKinematicTranslation(l.pos);
        body.setNextKinematicRotation(l.rot);
      }
    }
  };
  pose(true);

  const bucketCenterLocal = { x: 0, y: -ec.bucketHeight / 2, z: -ec.bucketDepth / 2 };
  const zero = { x: 0, y: 0, z: 0 };
  const part = (body: RAPIER.RigidBody, boxes: Box[], color: number) => ({ body, boxes, color, spawnOffset: zero });

  return {
    info,
    config,
    cab,
    chassis,
    parts: [
      part(house, houseBoxes(), 0xe8b923),
      part(boom, boomBoxes(ec), 0xd9a51c),
      part(stick, stickBoxes(ec), 0xd9a51c),
      part(bucket, bBoxes, 0x555555),
    ],
    actuate(cmd, dt) {
      swing.update(dt, cmd.swing);
      const moves = [
        [boomA, cmd.bed],
        [stickA, cmd.stick],
        [bucketA, -cmd.tilt],
      ] as const;
      // The bucket never goes into the ground, so it scrapes along the floor instead of shoving sand through it:
      // lowering the boom further is refused, and a stick or bucket move lifts the boom just enough (like a
      // practised operator would).
      const lowest = () => bucketLowestY(links().bucket, ec.bucketHalfWidth, ec.bucketDepth, ec.bucketHeight);
      for (const [joint, input] of moves) {
        if (!input) continue;
        const before = lowest();
        joint.update(dt, input);
        let after = lowest();
        if (after >= GROUND_CLEARANCE || after >= before) continue;
        if (joint === boomA) {
          joint.update(dt, -input);
          continue;
        }
        for (let k = 0; k < 4 && after < GROUND_CLEARANCE && boomA.state !== 'up'; k++) {
          boomA.update(0.5 / BOOM_SPEED, 1);
          after = lowest();
        }
        if (after < GROUND_CLEARANCE) joint.update(dt, -input);
      }
      pose(false);
    },
    carrierCenter() {
      const t = bucket.translation();
      const off = rotateByQuat(bucketCenterLocal, bucket.rotation());
      return { x: t.x + off.x, y: t.y + off.y, z: t.z + off.z };
    },
    dumpAngle: () => 0,
    actuatorText: () =>
      `swing ${swing.angle.toFixed(0)}° · boom ${boomA.angle.toFixed(0)}° · stick ${stickA.angle.toFixed(0)}° · bucket ${bucketA.angle.toFixed(0)}°`,
    assistSand(grains, cmd) {
      // Arcade help: ball-shaped grains mostly get shoved ahead of the bucket instead of rolling in, so while
      // the bucket curls or the stick pulls in, loose grains just in front of the mouth are drawn into it.
      if (cmd.tilt >= 0 && cmd.stick <= 0) return;
      const t = bucket.translation();
      const r = bucket.rotation();
      const inv = { x: -r.x, y: -r.y, z: -r.z, w: r.w };
      const into = rotateByQuat({ x: 0, y: -SCOOP_PULL, z: 0 }, r);
      const w = ec.bucketHalfWidth;
      for (const g of grains) {
        if (!g.isEnabled()) continue;
        const p = g.translation();
        const l = rotateByQuat({ x: p.x - t.x, y: p.y - t.y, z: p.z - t.z }, inv);
        if (l.y > 0 && l.y < SCOOP_REACH && Math.abs(l.x) < w && l.z < 0 && l.z > -ec.bucketDepth) g.setLinvel(into, true);
      }
    },
    resetActuators() {
      for (const s of [swing, boomA, stickA, bucketA]) s.reset();
      pose(true);
    },
    hints: {
      hauling: 'Dig the pile and fill the truck',
      dumping: 'Dumping',
      keys: 'J/L swing · E/Q boom · I/K stick · X/Z open/curl bucket',
    },
  };
}
