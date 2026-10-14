import * as THREE from 'three';

/** Dump zone (zona tuang): striped ring on the ground plus a flag. */
export function createZoneMesh(center: { x: number; z: number }, radius: number): THREE.Group {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({ color: 0x3fa34d, transparent: true, opacity: 0.25 }),
  );
  fill.rotation.x = -Math.PI / 2;
  fill.position.set(center.x, 0.015, center.z);
  g.add(fill);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.25, radius, 48),
    new THREE.MeshBasicMaterial({ color: 0x3fa34d }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(center.x, 0.02, center.z);
  g.add(ring);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
  pole.position.set(center.x + radius + 0.5, 2, center.z);
  pole.castShadow = true;
  g.add(pole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x3fa34d, side: THREE.DoubleSide }),
  );
  flag.position.set(center.x + radius + 1.1, 3.6, center.z);
  g.add(flag);
  return g;
}
