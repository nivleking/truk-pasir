import RAPIER from '@dimforge/rapier3d-compat';

export const MAP_HALF_SIZE = 60;
export const BERM_HEIGHT = 2;

export type Rapier = typeof RAPIER;

export async function createWorld(): Promise<{ rapier: Rapier; world: RAPIER.World }> {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  // The ground slab itself is built per level (it has a hole for the dump pit), see physics/level.ts.

  // Earth berms around the edge so the truck cannot drive off the map.
  const edge = MAP_HALF_SIZE;
  for (const [x, z, hx, hz] of [
    [0, edge, edge, 1],
    [0, -edge, edge, 1],
    [edge, 0, 1, edge],
    [-edge, 0, 1, edge],
  ] as const) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, BERM_HEIGHT / 2, hz).setTranslation(x, BERM_HEIGHT / 2, z), ground);
  }

  return { rapier: RAPIER, world };
}
