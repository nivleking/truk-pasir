import * as THREE from 'three';
import { BED } from '../physics/bed';

/** Visual bed matching the colliders in physics/bed.ts. Origin = center of the floor. */
export function createBedMesh(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xd9a51c, side: THREE.DoubleSide });
  const { halfWidth: w, halfLength: l, wallHeight: h, rearLipHeight: lip, thickness: t } = BED;
  const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx * 2, sy * 2, sz * 2), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  };
  box(w, t, l, 0, 0, 0);
  box(t, h / 2, l, w, h / 2, 0);
  box(t, h / 2, l, -w, h / 2, 0);
  box(w, h / 2, t, 0, h / 2, l);
  box(w, lip / 2, t, 0, lip / 2, -l);
  return g;
}
