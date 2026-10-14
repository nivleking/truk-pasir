import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { SAND } from '../physics/sand';

export function createSandMesh() {
  const mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(SAND.radius, 1),
    new THREE.MeshStandardMaterial({ color: 0xe0c27a, flatShading: true }),
    SAND.poolSize,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();

  function sync(grains: RAPIER.RigidBody[]) {
    let n = 0;
    for (const g of grains) {
      if (!g.isEnabled()) continue;
      const t = g.translation();
      m.compose(p.set(t.x, t.y, t.z), q, one);
      mesh.setMatrixAt(n++, m);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, sync };
}
