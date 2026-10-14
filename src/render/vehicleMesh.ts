import * as THREE from 'three';
import type { Box } from '../physics/parts';
import type { Vehicle } from '../physics/vehicle';

export interface VehicleMesh {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  parts: THREE.Group[];
  dispose(): void;
}

function boxesMesh(boxes: Box[], material: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (const b of boxes) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.hx * 2, b.hy * 2, b.hz * 2), material);
    m.position.set(b.x, b.y, b.z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/** Box-shaped placeholder vehicle built from its physics config. Swap for glTF models later. */
export function createVehicleMesh(v: Vehicle): VehicleMesh {
  const h = v.config.halfExtents;
  const root = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe8b923 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x223344 });

  root.add(new THREE.Mesh(new THREE.BoxGeometry(h.x * 2, h.y * 2, h.z * 2), dark));
  const c = v.cab;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(c.halfWidth * 2, c.height, c.halfLength * 2), yellow);
  cab.position.set(0, h.y + c.height / 2, c.z);
  root.add(cab);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(c.halfWidth * 1.8, c.height * 0.45, 0.05), glass);
  windshield.position.set(0, h.y + c.height * 0.65, c.z + c.halfLength + 0.01);
  root.add(windshield);
  root.traverse((o) => (o.castShadow = true));

  const r = v.config.wheelRadius;
  const wheelGeo = new THREE.CylinderGeometry(r, r, v.config.wheelWidth, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = v.config.wheels.map(() => {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.castShadow = true;
    return w;
  });

  const parts = v.parts.map((p) =>
    boxesMesh(p.boxes, new THREE.MeshStandardMaterial({ color: p.color, side: THREE.DoubleSide })),
  );

  return {
    root,
    wheels,
    parts,
    dispose() {
      for (const o of [root, ...wheels, ...parts]) {
        o.removeFromParent();
        o.traverse((x) => {
          if (x instanceof THREE.Mesh) x.geometry.dispose();
        });
      }
    },
  };
}
