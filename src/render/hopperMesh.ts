import * as THREE from 'three';
import { HOPPER } from '../physics/hopperStructure';

export function createHopperMesh(): THREE.Group {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x6b7680, metalness: 0.3, roughness: 0.6 });
  const { x, z } = HOPPER.position;
  const s = HOPPER.legHalfSpacing;
  for (const [dx, dz] of [[s, s], [-s, s], [s, -s], [-s, -s]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, HOPPER.legHeight, 0.4), steel);
    leg.position.set(x + dx, HOPPER.legHeight / 2, z + dz);
    leg.castShadow = true;
    g.add(leg);
  }
  // Funnel: wide on top, narrow spout at the bottom.
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.5, 2, 4, 1, true), steel);
  funnel.rotation.y = Math.PI / 4;
  funnel.material.side = THREE.DoubleSide;
  funnel.position.set(x, HOPPER.spoutHeight + 1.2, z);
  funnel.castShadow = true;
  g.add(funnel);
  const pile = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 1.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xe0c27a, flatShading: true }),
  );
  pile.position.set(x, HOPPER.spoutHeight + 2.4, z);
  g.add(pile);

  // Marker on the ground showing where to stop.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(HOPPER.zoneRadius - 0.15, HOPPER.zoneRadius, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.02, z);
  g.add(ring);
  return g;
}
