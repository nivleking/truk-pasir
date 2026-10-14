import type RAPIER from '@dimforge/rapier3d-compat';
import { driveForces } from '../core/drive';
import type { DriveCommands } from '../core/input';
import type { Rapier } from './world';

/** Truck dimensions and tuning. Change these to adjust the feel. */
export const TRUCK = {
  halfExtents: { x: 1.2, y: 0.6, z: 2.6 },
  mass: 8000,
  wheelRadius: 0.55,
  suspensionRest: 0.45,
  suspensionStiffness: 30,
  frictionSlip: 2.2,
  engineForce: 32000,
  brakeForce: 400,
  coastBrake: 60,
  reverseFactor: 0.4,
  maxSteer: 0.5,
  /** Wheel positions relative to chassis center: 2 steering front, 4 driven rear. */
  wheels: [
    { x: 1.15, z: 2.0, front: true },
    { x: -1.15, z: 2.0, front: true },
    { x: 1.15, z: -0.9, front: false },
    { x: -1.15, z: -0.9, front: false },
    { x: 1.15, z: -2.1, front: false },
    { x: -1.15, z: -2.1, front: false },
  ],
} as const;

export interface Truck {
  body: RAPIER.RigidBody;
  controller: RAPIER.DynamicRayCastVehicleController;
  apply(cmd: DriveCommands, steer: number): void;
  speedKmh(): number;
}

export function createTruck(rapier: Rapier, world: RAPIER.World): Truck {
  const h = TRUCK.halfExtents;
  const body = world.createRigidBody(
    rapier.RigidBodyDesc.dynamic().setTranslation(0, 2, 0).setCanSleep(false),
  );
  const volume = 8 * h.x * h.y * h.z;
  world.createCollider(rapier.ColliderDesc.cuboid(h.x, h.y, h.z).setDensity(TRUCK.mass / volume), body);

  const controller = world.createVehicleController(body);
  controller.indexUpAxis = 1;
  controller.setIndexForwardAxis = 2;

  TRUCK.wheels.forEach((w, i) => {
    controller.addWheel(
      { x: w.x, y: -h.y * 0.5, z: w.z },
      { x: 0, y: -1, z: 0 },
      { x: -1, y: 0, z: 0 },
      TRUCK.suspensionRest,
      TRUCK.wheelRadius,
    );
    controller.setWheelSuspensionStiffness(i, TRUCK.suspensionStiffness);
    controller.setWheelFrictionSlip(i, TRUCK.frictionSlip);
    controller.setWheelMaxSuspensionForce(i, 200000);
  });

  return {
    body,
    controller,
    apply(cmd, steer) {
      const f = driveForces(cmd, controller.currentVehicleSpeed() * 3.6, TRUCK);
      TRUCK.wheels.forEach((w, i) => {
        controller.setWheelSteering(i, w.front ? steer * TRUCK.maxSteer : 0);
        controller.setWheelEngineForce(i, w.front ? 0 : f.engine / 4);
        controller.setWheelBrake(i, f.brake);
      });
    },
    speedKmh() {
      return controller.currentVehicleSpeed() * 3.6;
    },
  };
}
