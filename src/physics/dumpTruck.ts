import type RAPIER from '@dimforge/rapier3d-compat';
import { createDumpBed } from '../core/dumpBed';
import type { VehicleInfo } from '../core/vehicles';
import { createChassis, type ChassisConfig } from './chassis';
import { shakeOffset } from '../core/shake';
import { createBoxBody, createHinge, deg, type Box } from './parts';
import type { CabSpec, Vehicle } from './vehicle';
import type { Rapier } from './world';

/** Bed (bak) dimensions in meters; bed origin = center of the floor. */
export interface BedConfig {
  halfWidth: number;
  halfLength: number;
  wallHeight: number;
  rearLipHeight: number;
  thickness: number;
  /** Bed origin in chassis-local coordinates. */
  offset: { x: number; y: number; z: number };
  mass: number;
  maxAngle: number;
}

/** Degrees of bed tilt at which the tailgate opens; a closed lip dams the sand in. */
export const TAILGATE_OPEN = 12;

export function bedBoxes(b: BedConfig): Box[] {
  const { halfWidth: w, halfLength: l, wallHeight: h, rearLipHeight: lip, thickness: t } = b;
  return [
    { hx: w, hy: t, hz: l, x: 0, y: 0, z: 0 }, // floor
    { hx: t, hy: h / 2, hz: l, x: w, y: h / 2, z: 0 }, // left wall
    { hx: t, hy: h / 2, hz: l, x: -w, y: h / 2, z: 0 }, // right wall
    { hx: w, hy: h / 2, hz: t, x: 0, y: h / 2, z: l }, // front wall (behind the cab)
    { hx: w, hy: lip / 2, hz: t, x: 0, y: lip / 2, z: -l }, // tailgate: opens once the bed tips (see TAILGATE_OPEN)
  ];
}

export function createDumpTruck(
  rapier: Rapier,
  world: RAPIER.World,
  info: VehicleInfo,
  config: ChassisConfig,
  bedCfg: BedConfig,
  cab: CabSpec,
): Vehicle {
  const chassis = createChassis(rapier, world, config);
  const c = chassis.body.translation();
  const o = bedCfg.offset;
  const boxes = bedBoxes(bedCfg);
  const bed = createBoxBody(rapier, world, { x: c.x + o.x, y: c.y + o.y, z: c.z + o.z }, boxes, bedCfg.mass, 0.12);

  // Hinge at the rear bottom edge of the bed.
  const l = bedCfg.halfLength;
  const hinge = createHinge(rapier, world, chassis.body, { x: o.x, y: o.y, z: o.z - l }, bed, { x: 0, y: 0, z: -l }, 4e6, 4e5);
  const tailgate = bed.collider(bed.numColliders() - 1);
  const state = createDumpBed({ maxAngle: bedCfg.maxAngle, speed: 18 });
  hinge.setRad(0);
  let t = 0;

  return {
    info,
    config,
    cab,
    chassis,
    parts: [
      {
        body: bed,
        boxes,
        color: 0xd9a51c,
        spawnOffset: o,
        toggleBox: { index: boxes.length - 1, visible: () => state.angle < TAILGATE_OPEN },
      },
    ],
    actuate(cmd, dt) {
      state.update(dt, cmd.bed);
      t += dt;
      hinge.setRad(-deg(state.angle + shakeOffset(t, state.state, cmd.bed)));
      tailgate.setEnabled(state.angle < TAILGATE_OPEN); // negative lifts the front of the bed
    },
    carrierCenter() {
      return bed.translation();
    },
    dumpAngle: () => state.angle,
    actuatorText: () => `bak ${state.angle.toFixed(0)}°`,
    resetActuators() {
      state.update(1000, -1);
      hinge.setRad(0);
      tailgate.setEnabled(true);
    },
    hints: {
      hauling: 'Mundur sampai roda kena pembatas kuning lubang tuang, lalu angkat bak (E)',
      dumping: 'Menuang! Tahan E untuk menggetarkan bak, Q kalau sudah kosong',
      keys: 'E/Q angkat/turunkan bak',
    },
  };
}
