import type RAPIER from '@dimforge/rapier3d-compat';
import { createDumpBed } from '../core/dumpBed';
import { rotateByQuat } from '../core/quat';
import type { VehicleInfo } from '../core/vehicles';
import { createChassis, type ChassisConfig } from './chassis';
import { createBoxBody, createHinge, deg, type Box } from './parts';
import type { CabSpec, Vehicle } from './vehicle';
import type { Rapier } from './world';

export interface LoaderConfig {
  /** Arm pivot in chassis-local coordinates */
  armPivot: { x: number; y: number; z: number };
  armLength: number;
  armMass: number;
  /** Arm angle above horizontal, degrees */
  armMin: number;
  armMax: number;
  bucketHalfWidth: number;
  bucketDepth: number;
  bucketHeight: number;
  bucketMass: number;
  /** Bucket tilt, degrees: negative = curled back (carry), positive = tipped forward (dump) */
  tiltMin: number;
  tiltMax: number;
}

export function armBoxes(c: LoaderConfig): Box[] {
  const half = c.armLength / 2;
  const x = c.bucketHalfWidth - 0.3;
  return [
    { hx: 0.12, hy: 0.15, hz: half, x, y: 0, z: 0 },
    { hx: 0.12, hy: 0.15, hz: half, x: -x, y: 0, z: 0 },
    { hx: x, hy: 0.1, hz: 0.1, x: 0, y: 0, z: half - 0.6 }, // cross beam
  ];
}

/** Bucket hangs below its hinge (at the arm tip); open at the top and front. */
export function bucketBoxes(c: LoaderConfig): Box[] {
  const w = c.bucketHalfWidth;
  const d = c.bucketDepth / 2;
  const h = c.bucketHeight;
  const t = 0.05;
  return [
    { hx: w, hy: h / 2, hz: t, x: 0, y: -h / 2, z: 0 }, // back plate
    { hx: w, hy: t, hz: d, x: 0, y: -h, z: d }, // floor
    { hx: t, hy: h / 2, hz: d, x: w, y: -h / 2, z: d }, // sides
    { hx: t, hy: h / 2, hz: d, x: -w, y: -h / 2, z: d },
    { hx: w, hy: 0.08, hz: t, x: 0, y: -h + 0.08, z: 2 * d }, // small front lip
  ];
}

export function createLoader(
  rapier: Rapier,
  world: RAPIER.World,
  info: VehicleInfo,
  config: ChassisConfig,
  lc: LoaderConfig,
  cab: CabSpec,
): Vehicle {
  const chassis = createChassis(rapier, world, config);
  const c = chassis.body.translation();
  const half = lc.armLength / 2;
  const p = lc.armPivot;

  const armOffset = { x: p.x, y: p.y, z: p.z + half };
  const arm = createBoxBody(rapier, world, { x: c.x + armOffset.x, y: c.y + armOffset.y, z: c.z + armOffset.z }, armBoxes(lc), lc.armMass);
  const bucketOffset = { x: p.x, y: p.y, z: p.z + lc.armLength };
  const bucket = createBoxBody(
    rapier,
    world,
    { x: c.x + bucketOffset.x, y: c.y + bucketOffset.y, z: c.z + bucketOffset.z },
    bucketBoxes(lc),
    lc.bucketMass,
  );

  const armHinge = createHinge(rapier, world, chassis.body, p, arm, { x: 0, y: 0, z: -half }, 6e6, 6e5);
  const bucketHinge = createHinge(rapier, world, arm, { x: 0, y: 0, z: half }, bucket, { x: 0, y: 0, z: 0 }, 2e6, 2e5);

  const armState = createDumpBed({ minAngle: lc.armMin, maxAngle: lc.armMax, speed: 30 });
  const tiltState = createDumpBed({ minAngle: lc.tiltMin, maxAngle: lc.tiltMax, speed: 45 });

  const apply = () => {
    const armRad = -deg(armState.angle); // negative raises the arm
    armHinge.setRad(armRad);
    // Like a real loader's linkage: the bucket's angle is relative to the ground, not to the arm.
    bucketHinge.setRad(deg(tiltState.angle) - armRad);
  };
  apply();

  const bucketCenterLocal = { x: 0, y: -lc.bucketHeight / 2, z: lc.bucketDepth / 2 };

  return {
    info,
    config,
    cab,
    chassis,
    parts: [
      { body: arm, boxes: armBoxes(lc), color: 0x555555, spawnOffset: armOffset },
      { body: bucket, boxes: bucketBoxes(lc), color: 0xd9a51c, spawnOffset: bucketOffset },
    ],
    actuate(cmd, dt) {
      armState.update(dt, cmd.bed);
      tiltState.update(dt, cmd.tilt);
      apply();
    },
    carrierCenter() {
      const t = bucket.translation();
      const off = rotateByQuat(bucketCenterLocal, bucket.rotation());
      return { x: t.x + off.x, y: t.y + off.y, z: t.z + off.z };
    },
    dumpAngle: () => Math.max(0, tiltState.angle),
    actuatorText: () => `lengan ${armState.angle.toFixed(0)}° · sendok ${tiltState.angle.toFixed(0)}°`,
    resetActuators() {
      armState.update(1000, -1);
      tiltState.update(1000, -1);
      apply();
    },
    hints: {
      hauling: 'Bawa ke lubang tuang, angkat sendok di atas lubang, lalu tuang (X)',
      dumping: 'Menuang! Tarik sendok kembali (Z) kalau sudah kosong',
      keys: 'E/Q lengan · X/Z tuang/tarik sendok',
    },
  };
}
