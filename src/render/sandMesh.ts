import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { SAND } from '../physics/sand';

/** Damp-sand / dirt palette; each grain keeps one color. */
const PALETTE = [0xc9a46a, 0xb98f55, 0xa57a45, 0xd6b47c, 0x8f6a3c, 0xbf9a62];

/**
 * Grains are drawn as lumpy, slightly flattened clods of random size and color that roll with their
 * physics ball, so a load reads as a heap of dirt instead of a pile of marbles.
 */
export function createSandMesh() {
  const geo = new THREE.DodecahedronGeometry(SAND.radius * 1.15, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), SAND.poolSize);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;

  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const scales: THREE.Vector3[] = [];
  const offsets: THREE.Quaternion[] = [];
  const colors: THREE.Color[] = [];
  for (let i = 0; i < SAND.poolSize; i++) {
    const s = 0.8 + rand() * 0.5;
    scales.push(new THREE.Vector3(s * (0.9 + rand() * 0.3), s * (0.6 + rand() * 0.3), s * (0.9 + rand() * 0.3)));
    offsets.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.3, rand() * 6.3, rand() * 6.3)));
    colors.push(new THREE.Color(PALETTE[i % PALETTE.length]!).multiplyScalar(0.9 + rand() * 0.2));
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();

  function sync(grains: RAPIER.RigidBody[]) {
    let n = 0;
    grains.forEach((g, i) => {
      if (!g.isEnabled()) return;
      const t = g.translation();
      const r = g.rotation();
      q.set(r.x, r.y, r.z, r.w).multiply(offsets[i]!);
      m.compose(p.set(t.x, t.y, t.z), q, scales[i]!);
      mesh.setMatrixAt(n, m);
      // Colors are per instance slot, so keep each grain's color with it.
      mesh.setColorAt(n, colors[i]!);
      n++;
    });
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  return { mesh, sync };
}
