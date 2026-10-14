import type RAPIER from '@dimforge/rapier3d-compat';
import { driveForces } from '../core/drive';
import type { DriveCommands } from '../core/input';
import type { Rapier } from './world';

/**
 * Vehicle parts are in their own collision group so a bed/arm/bucket never collides with its own chassis.
 * Rapier groups: high 16 bits = membership, low 16 bits = what it collides with.
 */
export const VEHICLE_GROUPS = (0x0002 << 16) | 0xfffd;
/** Wheel rays ignore the vehicle's own parts. */
const WHEEL_RAY_GROUPS = (0xffff << 16) | 0xfffd;

export interface WheelSpec {
  x: number;
  z: number;
  steer: boolean;
  driven: boolean;
}

/** Chassis + wheels + drive tuning. Change these numbers to adjust a vehicle's feel. */
export interface ChassisConfig {
  halfExtents: { x: number; y: number; z: number };
  mass: number;
  wheelRadius: number;
  wheelWidth: number;
  suspensionRest: number;
  suspensionStiffness: number;
  frictionSlip: number;
  engineForce: number;
  brakeForce: number;
  coastBrake: number;
  reverseFactor: number;
  maxSteer: number;
  wheels: WheelSpec[];
}

export interface Chassis {
  body: RAPIER.RigidBody;
  controller: RAPIER.DynamicRayCastVehicleController;
  spawnY: number;
  drive(cmd: DriveCommands, steer: number): void;
  update(dt: number): void;
  speedKmh(): number;
}

export function createChassis(rapier: Rapier, world: RAPIER.World, cfg: ChassisConfig): Chassis {
  const h = cfg.halfExtents;
  const spawnY = cfg.wheelRadius + cfg.suspensionRest + h.y + 0.4;
  const body = world.createRigidBody(rapier.RigidBodyDesc.dynamic().setTranslation(0, spawnY, 0).setCanSleep(false));
  const volume = 8 * h.x * h.y * h.z;
  world.createCollider(
    rapier.ColliderDesc.cuboid(h.x, h.y, h.z).setDensity(cfg.mass / volume).setCollisionGroups(VEHICLE_GROUPS),
    body,
  );

  const controller = world.createVehicleController(body);
  controller.indexUpAxis = 1;
  controller.setIndexForwardAxis = 2;

  const drivenCount = cfg.wheels.filter((w) => w.driven).length;
  cfg.wheels.forEach((w, i) => {
    controller.addWheel(
      { x: w.x, y: -h.y * 0.5, z: w.z },
      { x: 0, y: -1, z: 0 },
      { x: -1, y: 0, z: 0 },
      cfg.suspensionRest,
      cfg.wheelRadius,
    );
    controller.setWheelSuspensionStiffness(i, cfg.suspensionStiffness);
    controller.setWheelFrictionSlip(i, cfg.frictionSlip);
    controller.setWheelMaxSuspensionForce(i, cfg.mass * 30);
  });

  const speedKmh = () => controller.currentVehicleSpeed() * 3.6;

  return {
    body,
    controller,
    spawnY,
    drive(cmd, steer) {
      const f = driveForces(cmd, speedKmh(), cfg);
      cfg.wheels.forEach((w, i) => {
        controller.setWheelSteering(i, w.steer ? steer * cfg.maxSteer : 0);
        controller.setWheelEngineForce(i, w.driven ? f.engine / drivenCount : 0);
        controller.setWheelBrake(i, f.brake);
      });
    },
    update(dt) {
      controller.updateVehicle(dt, undefined, WHEEL_RAY_GROUPS);
    },
    speedKmh,
  };
}
