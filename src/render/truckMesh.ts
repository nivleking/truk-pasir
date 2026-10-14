import * as THREE from 'three';
import { TRUCK } from '../physics/truck';

export interface TruckMesh {
  root: THREE.Group;
  wheels: THREE.Object3D[];
}

/** Box-shaped placeholder truck: chassis and cab (the bed is its own mesh, see bedMesh.ts). Swap for a glTF model later. */
export function createTruckMesh(): TruckMesh {
  const h = TRUCK.halfExtents;
  const root = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe8b923 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x223344 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(h.x * 2, h.y * 2, h.z * 2), dark);
  root.add(chassis);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(h.x * 2, 1.4, 1.6), yellow);
  cab.position.set(0, h.y + 0.7, h.z - 0.8);
  root.add(cab);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(h.x * 1.8, 0.6, 0.05), glass);
  windshield.position.set(0, h.y + 1.0, h.z + 0.01);
  root.add(windshield);

  root.traverse((o) => {
    o.castShadow = true;
  });

  const wheelGeo = new THREE.CylinderGeometry(TRUCK.wheelRadius, TRUCK.wheelRadius, 0.45, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = TRUCK.wheels.map(() => {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.castShadow = true;
    return w;
  });

  return { root, wheels };
}
