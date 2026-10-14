import type RAPIER from '@dimforge/rapier3d-compat';
import { TRUCK } from './truck';
import type { Rapier } from './world';

/** Bed (bak) dimensions, in meters, relative to the bed body's origin (center of the floor). */
export const BED = {
  halfWidth: 1.15,
  halfLength: 1.6,
  wallHeight: 0.9,
  rearLipHeight: 0.25,
  thickness: 0.05,
  /** Bed origin in chassis-local coordinates. */
  offset: { x: 0, y: TRUCK.halfExtents.y + 0.1, z: -1.0 },
  mass: 1200,
} as const;

export interface Bed {
  body: RAPIER.RigidBody;
  /** Target tilt in degrees; the joint motor drives the bed there. */
  setAngle(deg: number): void;
}

export function createBed(rapier: Rapier, world: RAPIER.World, chassis: RAPIER.RigidBody): Bed {
  const c = chassis.translation();
  const body = world.createRigidBody(
    rapier.RigidBodyDesc.dynamic()
      .setTranslation(c.x + BED.offset.x, c.y + BED.offset.y, c.z + BED.offset.z)
      .setCanSleep(false)
      .setCcdEnabled(true),
  );

  const { halfWidth: w, halfLength: l, wallHeight: hgt, rearLipHeight: lip, thickness: t } = BED;
  const parts: [number, number, number, number, number, number][] = [
    // half extents x,y,z, then center x,y,z
    [w, t, l, 0, 0, 0], // floor
    [t, hgt / 2, l, w, hgt / 2, 0], // left wall
    [t, hgt / 2, l, -w, hgt / 2, 0], // right wall
    [w, hgt / 2, t, 0, hgt / 2, l], // front wall (behind the cab)
    [w, lip / 2, t, 0, lip / 2, -l], // low rear lip: sand slides over it when tilted
  ];
  const volume = parts.reduce((v, p) => v + 8 * p[0] * p[1] * p[2], 0);
  for (const [hx, hy, hz, x, y, z] of parts) {
    world.createCollider(
      rapier.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setDensity(BED.mass / volume).setFriction(0.6),
      body,
    );
  }

  // Hinge at the rear bottom edge of the bed, around the truck's X axis.
  const hingeChassis = { x: 0, y: BED.offset.y, z: BED.offset.z - l };
  const hingeBed = { x: 0, y: 0, z: -l };
  const joint = world.createImpulseJoint(
    rapier.JointData.revolute(hingeChassis, hingeBed, { x: 1, y: 0, z: 0 }),
    chassis,
    body,
    true,
  ) as RAPIER.RevoluteImpulseJoint;
  joint.setContactsEnabled(false);

  const setAngle = (deg: number) => {
    // Negative rotation around +X lifts the front of the bed.
    joint.configureMotorPosition((-deg * Math.PI) / 180, 2e6, 2e5);
  };
  setAngle(0);

  return { body, setAngle };
}
