import * as THREE from 'three';
import type { Bump } from '../core/bumps';
import { groundBoxes, PIT, type Level } from '../core/levels';
import { yawTiltQuat } from '../core/quat';
import { MAP_HALF_SIZE } from '../physics/world';
import { createBumpMesh } from './bumpMesh';
import { createHopperMesh } from './hopperMesh';

const COLORS = { ground: 0xc9a66b, floor: 0x6e5432, wall: 0x7a5d38, curb: 0xe8c22a } as const;

/** Ground with the dump pit, obstacles, hopper, bumps and decoration rocks for one level. */
export function createLevelMesh(level: Level, bumps: Bump[]): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const mats = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (color: number) => {
    let m = mats.get(color);
    if (!m) mats.set(color, (m = new THREE.MeshStandardMaterial({ color })));
    return m;
  };
  const box = (hx: number, hy: number, hz: number, color: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat(color));
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };

  for (const b of groundBoxes(level.pit, 100)) box(b.hx, b.hy, b.hz, COLORS[b.part]).position.set(b.x, b.y, b.z);
  // Black stripes on the yellow curbs so the pit edge reads from far away.
  for (const b of groundBoxes(level.pit, 100).filter((b) => b.part === 'curb')) {
    const long = b.hx > b.hz;
    const len = (long ? b.hx : b.hz) * 2;
    for (let s = -len / 2 + 0.5; s < len / 2; s += 1) {
      const stripe = box(long ? 0.2 : b.hx + 0.01, b.hy + 0.01, long ? b.hz + 0.01 : 0.2, 0x222222);
      stripe.position.set(b.x + (long ? s : 0), b.y, b.z + (long ? 0 : s));
    }
  }

  const q = new THREE.Quaternion();
  for (const o of level.obstacles) {
    const r = yawTiltQuat(o.yaw ?? 0, o.tilt ?? 0);
    q.set(r.x, r.y, r.z, r.w);
    if (o.kind === 'cone') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(o.hx * 1.3, o.h, 12), mat(0xff6a13));
      cone.position.set(o.x, o.h / 2, o.z);
      cone.castShadow = true;
      group.add(cone);
      continue;
    }
    const m = box(o.hx, o.h / 2, o.hz, o.kind === 'wall' ? 0xa7a7a0 : 0x8f6b3e);
    m.position.set(o.x, o.kind === 'ramp' ? 0 : o.h / 2, o.z);
    m.quaternion.copy(q);
  }

  group.add(createHopperMesh(level.hopper), createBumpMesh(bumps));

  // Flag next to the pit.
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4), mat(0xdddddd));
  pole.position.set(level.pit.x + PIT.half + 1, 2, level.pit.z);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshStandardMaterial({ color: 0x3fa34d, side: THREE.DoubleSide }));
  flag.position.set(level.pit.x + PIT.half + 1.6, 3.6, level.pit.z);
  group.add(pole, flag);

  // Scattered rocks give a sense of speed; keep them out of the pit and obstacles.
  const rockCount = 120;
  const rocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.35),
    new THREE.MeshStandardMaterial({ color: 0x7d6440, flatShading: true }),
    rockCount,
  );
  const m = new THREE.Matrix4();
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let n = 0;
  for (let i = 0; i < rockCount * 3 && n < rockCount; i++) {
    const x = (rand() * 2 - 1) * (MAP_HALF_SIZE - 3);
    const z = (rand() * 2 - 1) * (MAP_HALF_SIZE - 3);
    const sc = 0.5 + rand();
    if (Math.hypot(x - level.pit.x, z - level.pit.z) < PIT.half + 2) continue;
    if (level.obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < Math.hypot(o.hx, o.hz) + 1)) continue;
    m.compose(new THREE.Vector3(x, 0.1, z), new THREE.Quaternion(), new THREE.Vector3(sc, sc * 0.6, sc));
    rocks.setMatrixAt(n++, m);
  }
  rocks.count = n;
  rocks.receiveShadow = true;
  group.add(rocks);

  return {
    group,
    dispose() {
      group.removeFromParent();
      group.traverse((x) => {
        if (x instanceof THREE.Mesh) x.geometry.dispose();
      });
    },
  };
}
