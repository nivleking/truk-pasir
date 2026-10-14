import * as THREE from 'three';
import type { Bump } from '../core/bumps';
import { bumpCenterY } from '../physics/bumps';

export function createBumpMesh(bumps: Bump[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xb48f55 }),
    bumps.length,
  );
  const m = new THREE.Matrix4();
  bumps.forEach((b, i) => {
    m.compose(new THREE.Vector3(b.x, bumpCenterY(b), b.z), new THREE.Quaternion(), new THREE.Vector3(b.radius, b.radius, b.radius));
    mesh.setMatrixAt(i, m);
  });
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
