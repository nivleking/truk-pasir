import type RAPIER from '@dimforge/rapier3d-compat';
import type { Bump } from '../core/bumps';
import { groundBoxes, type Level } from '../core/levels';
import { yawTiltQuat } from '../core/quat';
import { createBumps } from './bumps';
import { createHopperStructure } from './hopperStructure';
import type { Rapier } from './world';

/** Everything static in a level lives on one fixed body, so switching levels is a single removal. */
export function createLevelPhysics(rapier: Rapier, world: RAPIER.World, level: Level, bumps: Bump[]) {
  const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
  for (const b of groundBoxes(level.pit, 100)) {
    world.createCollider(rapier.ColliderDesc.cuboid(b.hx, b.hy, b.hz).setTranslation(b.x, b.y, b.z).setFriction(b.part === 'ground' ? 1 : 0.8), body);
  }
  for (const o of level.obstacles) {
    const y = o.kind === 'ramp' ? 0 : o.h / 2;
    world.createCollider(
      rapier.ColliderDesc.cuboid(o.hx, o.h / 2, o.hz)
        .setTranslation(o.x, y, o.z)
        .setRotation(yawTiltQuat(o.yaw ?? 0, o.tilt ?? 0))
        .setFriction(o.kind === 'ramp' ? 1 : 0.5),
      body,
    );
  }
  createHopperStructure(rapier, world, body, level.hopper);
  createBumps(rapier, world, body, bumps);
  return {
    dispose() {
      world.removeRigidBody(body);
    },
  };
}
