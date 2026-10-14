import type RAPIER from '@dimforge/rapier3d-compat';
import type { Rapier } from './world';

export const SAND = {
  poolSize: 400,
  radius: 0.14,
  density: 1600,
  friction: 0.9,
} as const;

const PARKED = { x: 0, y: -100, z: 0 };

export interface SandPool {
  grains: RAPIER.RigidBody[];
  /** Activate one grain at `pos`. Returns false when the pool is exhausted. */
  spawn(pos: { x: number; y: number; z: number }): boolean;
  /** Return grains that fell out of the world to the pool. */
  recycle(): void;
  activeCount(): number;
  clear(): void;
}

export function createSandPool(rapier: Rapier, world: RAPIER.World): SandPool {
  const grains: RAPIER.RigidBody[] = [];
  const free: RAPIER.RigidBody[] = [];

  for (let i = 0; i < SAND.poolSize; i++) {
    const body = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic().setTranslation(PARKED.x, PARKED.y, PARKED.z).setLinearDamping(0.1).setAngularDamping(1),
    );
    world.createCollider(
      rapier.ColliderDesc.ball(SAND.radius).setDensity(SAND.density).setFriction(SAND.friction).setRestitution(0),
      body,
    );
    body.setEnabled(false);
    grains.push(body);
    free.push(body);
  }

  const park = (b: RAPIER.RigidBody) => {
    b.setEnabled(false);
    b.setTranslation(PARKED, false);
    b.setLinvel({ x: 0, y: 0, z: 0 }, false);
    free.push(b);
  };

  return {
    grains,
    spawn(pos) {
      const b = free.pop();
      if (!b) return false;
      b.setTranslation(pos, true);
      b.setLinvel({ x: 0, y: -2, z: 0 }, true);
      b.setEnabled(true);
      return true;
    },
    recycle() {
      for (const b of grains) if (b.isEnabled() && b.translation().y < -5) park(b);
    },
    activeCount() {
      return SAND.poolSize - free.length;
    },
    clear() {
      for (const b of grains) if (b.isEnabled()) park(b);
    },
  };
}
