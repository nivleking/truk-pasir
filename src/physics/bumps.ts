import type RAPIER from '@dimforge/rapier3d-compat';
import type { Bump } from '../core/bumps';
import type { Rapier } from './world';

/** How much of each bump sphere sticks out of the ground, as a fraction of its radius. */
export const BUMP_HEIGHT_RATIO = 0.3;

export const bumpCenterY = (b: Bump) => -b.radius * (1 - BUMP_HEIGHT_RATIO);

/** Each bump is a sphere mostly buried in the ground: a smooth mound the wheels roll over. */
export function createBumps(rapier: Rapier, world: RAPIER.World, ground: RAPIER.RigidBody, bumps: Bump[]) {
  for (const b of bumps) {
    world.createCollider(rapier.ColliderDesc.ball(b.radius).setTranslation(b.x, bumpCenterY(b), b.z).setFriction(1), ground);
  }
}
