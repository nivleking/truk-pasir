import type RAPIER from '@dimforge/rapier3d-compat';
import { VEHICLE_GROUPS } from './chassis';
import type { Rapier } from './world';

/** Box collider spec: half extents + center, in the part's local space. */
export type Box = { hx: number; hy: number; hz: number; x: number; y: number; z: number };

/** Dynamic body made of boxes with the given total mass, placed at `pos`. */
export function createBoxBody(rapier: Rapier, world: RAPIER.World, pos: RAPIER.Vector, boxes: Box[], mass: number, friction = 0.6) {
  const body = world.createRigidBody(
    rapier.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setCanSleep(false).setCcdEnabled(true),
  );
  const volume = boxes.reduce((v, b) => v + 8 * b.hx * b.hy * b.hz, 0);
  for (const b of boxes) {
    world.createCollider(
      rapier.ColliderDesc.cuboid(b.hx, b.hy, b.hz)
        .setTranslation(b.x, b.y, b.z)
        .setDensity(mass / volume)
        .setFriction(friction)
        .setFrictionCombineRule(friction < 0.6 ? rapier.CoefficientCombineRule.Min : rapier.CoefficientCombineRule.Average)
        .setCollisionGroups(VEHICLE_GROUPS),
      body,
    );
  }
  return body;
}

/** Hinge around the local X axis with a position motor; `setDeg` drives it to an angle. */
export function createHinge(
  rapier: Rapier,
  world: RAPIER.World,
  a: RAPIER.RigidBody,
  anchorA: RAPIER.Vector,
  b: RAPIER.RigidBody,
  anchorB: RAPIER.Vector,
  stiffness: number,
  damping: number,
) {
  const joint = world.createImpulseJoint(
    rapier.JointData.revolute(anchorA, anchorB, { x: 1, y: 0, z: 0 }),
    a,
    b,
    true,
  ) as RAPIER.RevoluteImpulseJoint;
  joint.setContactsEnabled(false);
  return {
    /** Rapier's positive rotation around +X tips the part's +Z end downward. */
    setRad(rad: number) {
      joint.configureMotorPosition(rad, stiffness, damping);
    },
  };
}

export const deg = (d: number) => (d * Math.PI) / 180;
