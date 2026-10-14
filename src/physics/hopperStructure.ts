import type RAPIER from '@dimforge/rapier3d-compat';
import type { Rapier } from './world';

/** Sand hopper (corong) the truck drives under. Spout position is where grains appear. */
export const HOPPER = {
  position: { x: 0, z: 22 },
  spoutHeight: 5.2,
  legHalfSpacing: 2.6,
  legHeight: 6,
  zoneRadius: 1.8,
} as const;

export function createHopperStructure(rapier: Rapier, world: RAPIER.World) {
  const ground = world.createRigidBody(rapier.RigidBodyDesc.fixed());
  const { x, z } = HOPPER.position;
  const s = HOPPER.legHalfSpacing;
  for (const [dx, dz] of [[s, s], [-s, s], [s, -s], [-s, -s]] as const) {
    world.createCollider(
      rapier.ColliderDesc.cuboid(0.2, HOPPER.legHeight / 2, 0.2).setTranslation(x + dx, HOPPER.legHeight / 2, z + dz),
      ground,
    );
  }
}

export function spoutPosition() {
  return { x: HOPPER.position.x, y: HOPPER.spoutHeight, z: HOPPER.position.z };
}
