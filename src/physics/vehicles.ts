import type RAPIER from '@dimforge/rapier3d-compat';
import type { VehicleInfo } from '../core/vehicles';
import type { ChassisConfig } from './chassis';
import { createDumpTruck, type BedConfig } from './dumpTruck';
import { createExcavator, type ExcavatorConfig } from './excavator';
import { createLoader, type LoaderConfig } from './loader';
import type { CabSpec, Vehicle } from './vehicle';
import type { Rapier } from './world';

// ---- Dump truck: the original, balanced truck ----
const DUMP_CHASSIS: ChassisConfig = {
  halfExtents: { x: 1.2, y: 0.6, z: 2.6 },
  mass: 8000,
  wheelRadius: 0.55,
  wheelWidth: 0.45,
  suspensionRest: 0.45,
  suspensionStiffness: 30,
  frictionSlip: 2.2,
  engineForce: 32000,
  brakeForce: 400,
  coastBrake: 60,
  reverseFactor: 0.6,
  maxSteer: 0.5,
  wheels: [
    { x: 1.15, z: 2.0, steer: true, driven: false },
    { x: -1.15, z: 2.0, steer: true, driven: false },
    { x: 1.15, z: -0.9, steer: false, driven: true },
    { x: -1.15, z: -0.9, steer: false, driven: true },
    { x: 1.15, z: -2.1, steer: false, driven: true },
    { x: -1.15, z: -2.1, steer: false, driven: true },
  ],
};
const DUMP_BED: BedConfig = {
  halfWidth: 1.15,
  halfLength: 1.6,
  wallHeight: 0.9,
  rearLipHeight: 0.25,
  thickness: 0.05,
  offset: { x: 0, y: 0.7, z: -1.0 },
  mass: 1200,
  maxAngle: 62,
};
const DUMP_CAB: CabSpec = { halfWidth: 1.2, height: 1.4, halfLength: 0.8, z: 1.8 };

// ---- Mining truck: huge, heavy, carries the most ----
const MINING_CHASSIS: ChassisConfig = {
  halfExtents: { x: 1.55, y: 0.75, z: 3.4 },
  mass: 16000,
  wheelRadius: 0.8,
  wheelWidth: 0.7,
  suspensionRest: 0.5,
  suspensionStiffness: 28,
  frictionSlip: 2.5,
  engineForce: 72000,
  brakeForce: 900,
  coastBrake: 120,
  reverseFactor: 0.6,
  maxSteer: 0.42,
  wheels: [
    { x: 1.5, z: 2.6, steer: true, driven: false },
    { x: -1.5, z: 2.6, steer: true, driven: false },
    { x: 1.5, z: -1.0, steer: false, driven: true },
    { x: -1.5, z: -1.0, steer: false, driven: true },
    { x: 1.5, z: -2.7, steer: false, driven: true },
    { x: -1.5, z: -2.7, steer: false, driven: true },
  ],
};
const MINING_BED: BedConfig = {
  halfWidth: 1.5,
  halfLength: 2.2,
  wallHeight: 1.1,
  rearLipHeight: 0.3,
  thickness: 0.06,
  offset: { x: 0, y: 0.85, z: -1.2 },
  mass: 2600,
  maxAngle: 62,
};
const MINING_CAB: CabSpec = { halfWidth: 1.0, height: 1.6, halfLength: 1.0, z: 2.4 };

// ---- Wheel loader: bucket on a lifting arm at the front ----
const LOADER_CHASSIS: ChassisConfig = {
  halfExtents: { x: 1.1, y: 0.55, z: 1.9 },
  mass: 9000,
  wheelRadius: 0.75,
  wheelWidth: 0.6,
  suspensionRest: 0.35,
  suspensionStiffness: 40,
  frictionSlip: 2.6,
  engineForce: 30000,
  brakeForce: 500,
  coastBrake: 90,
  reverseFactor: 0.8,
  maxSteer: 0.55,
  wheels: [
    { x: 1.3, z: 1.3, steer: true, driven: true },
    { x: -1.3, z: 1.3, steer: true, driven: true },
    { x: 1.3, z: -1.3, steer: false, driven: true },
    { x: -1.3, z: -1.3, steer: false, driven: true },
  ],
};
const LOADER: LoaderConfig = {
  armPivot: { x: 0, y: 1.2, z: 0.9 },
  armLength: 2.8,
  armMass: 700,
  armMin: -28,
  armMax: 45,
  bucketHalfWidth: 1.25,
  bucketDepth: 1.1,
  bucketHeight: 0.85,
  bucketMass: 500,
  tiltMin: -25,
  tiltMax: 70,
};
const LOADER_CAB: CabSpec = { halfWidth: 0.8, height: 1.6, halfLength: 0.7, z: -0.7 };

// ---- Excavator: tracked base (drawn as tracks, driven by hidden road wheels) with a swinging digging arm ----
const EXCAVATOR_CHASSIS: ChassisConfig = {
  halfExtents: { x: 1.3, y: 0.4, z: 1.8 },
  mass: 16000,
  wheelRadius: 0.42,
  wheelWidth: 0.55,
  suspensionRest: 0.25,
  suspensionStiffness: 60,
  frictionSlip: 3,
  engineForce: 38000,
  brakeForce: 900,
  coastBrake: 160,
  reverseFactor: 0.9,
  maxSteer: 0.6,
  wheels: [
    { x: 1.3, z: 1.4, steer: true, driven: true },
    { x: -1.3, z: 1.4, steer: true, driven: true },
    { x: 1.3, z: 0, steer: false, driven: true },
    { x: -1.3, z: 0, steer: false, driven: true },
    { x: 1.3, z: -1.4, steer: false, driven: true },
    { x: -1.3, z: -1.4, steer: false, driven: true },
  ],
};
const EXCAVATOR: ExcavatorConfig = {
  housePivot: { x: 0, y: 0.42, z: 0 },
  boomPivot: { x: -0.35, y: 0.75, z: 1.1 },
  boomLength: 4.2,
  stickLength: 2.6,
  // Oversized on purpose: a few good scoops should fill the truck.
  bucketHalfWidth: 0.75,
  bucketDepth: 1.2,
  bucketHeight: 1.05,
};
const EXCAVATOR_CAB: CabSpec = { halfWidth: 0.48, height: 1.4, halfLength: 0.6, z: 0.65 };

/** Career upgrades applied on top of a vehicle's base tuning. */
export interface Tuning {
  engine: number;
  grip: number;
}

export function createVehicle(rapier: Rapier, world: RAPIER.World, info: VehicleInfo, t: Tuning = { engine: 1, grip: 0 }): Vehicle {
  const tune = (c: ChassisConfig): ChassisConfig => ({ ...c, engineForce: c.engineForce * t.engine, frictionSlip: c.frictionSlip + t.grip });
  switch (info.id) {
    case 'mining-truck':
      return createDumpTruck(rapier, world, info, tune(MINING_CHASSIS), MINING_BED, MINING_CAB);
    case 'wheel-loader':
      return createLoader(rapier, world, info, tune(LOADER_CHASSIS), LOADER, LOADER_CAB);
    case 'excavator':
      return createExcavator(rapier, world, info, tune(EXCAVATOR_CHASSIS), EXCAVATOR, EXCAVATOR_CAB);
    default:
      return createDumpTruck(rapier, world, info, tune(DUMP_CHASSIS), DUMP_BED, DUMP_CAB);
  }
}
