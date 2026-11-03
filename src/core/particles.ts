import type { Vec3 } from './chaseCam';

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  /** 1 when born, fading to 0 at the end of its life. */
  alpha: number;
}

/**
 * Fixed pool of dust puffs: they drift, slow down, grow and fade. `items[0..count)` are alive.
 * When the pool is full the oldest puff is reused, so emitting never fails.
 */
export function createParticles(capacity: number) {
  const items: Particle[] = Array.from({ length: capacity }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size: 1, alpha: 0 }));
  let count = 0;
  return {
    items,
    get count() {
      return count;
    },
    emit(pos: Vec3, vel: Vec3, life: number, size: number) {
      let p: Particle;
      if (count < capacity) p = items[count++]!;
      else {
        let oldest = 0;
        for (let i = 1; i < count; i++) if (items[i]!.age / items[i]!.life > items[oldest]!.age / items[oldest]!.life) oldest = i;
        p = items[oldest]!;
      }
      Object.assign(p, { x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z, age: 0, life, size, alpha: 1 });
    },
    update(dt: number) {
      const drag = Math.exp(-2.5 * dt);
      for (let i = 0; i < count; ) {
        const p = items[i]!;
        p.age += dt;
        if (p.age >= p.life) {
          // Swap the dead one with the last live one.
          items[i] = items[count - 1]!;
          items[count - 1] = p;
          count--;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vx *= drag;
        p.vy = p.vy * drag + 0.15 * dt; // dust slowly rises
        p.vz *= drag;
        p.size *= 1 + 0.9 * dt;
        p.alpha = 1 - p.age / p.life;
        i++;
      }
    },
    clear() {
      count = 0;
    },
  };
}
