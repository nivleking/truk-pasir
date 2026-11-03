import * as THREE from 'three';
import type { Box } from '../physics/parts';
import type { Vehicle } from '../physics/vehicle';

export interface VehicleMesh {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  parts: THREE.Group[];
  dispose(): void;
}

const MAT = {
  paint: new THREE.MeshStandardMaterial({ color: 0xe8b923, roughness: 0.55, metalness: 0.15 }),
  paintDark: new THREE.MeshStandardMaterial({ color: 0xb98c12, roughness: 0.6, metalness: 0.15 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.8 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.4, metalness: 0.7 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.95, flatShading: true }),
  rim: new THREE.MeshStandardMaterial({ color: 0xc9c9c2, roughness: 0.4, metalness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x2a4a63, roughness: 0.1, metalness: 0.4, emissive: 0x0a1822 }),
  headlight: new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0b0, emissiveIntensity: 0.8 }),
  taillight: new THREE.MeshStandardMaterial({ color: 0xc0201a, emissive: 0x801010, emissiveIntensity: 0.6 }),
  beacon: new THREE.MeshStandardMaterial({ color: 0xff8a00, emissive: 0xff6a00, emissiveIntensity: 0.9 }),
  stripe: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }),
};

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (p: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) =>
  add(p, new THREE.BoxGeometry(w, h, d), mat, x, y, z);

/** Tire with tread blocks, rim and hub; spins around its local X axis. */
function wheelMesh(r: number, width: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.CylinderGeometry(r, r, width, 18, 1);
  tire.rotateZ(Math.PI / 2);
  add(g, tire, MAT.tire, 0, 0, 0);
  const treads = 12;
  for (let i = 0; i < treads; i++) {
    const a = (i / treads) * Math.PI * 2;
    const t = box(g, width * 0.9, r * 0.12, r * 0.22, MAT.tire, 0, Math.cos(a) * r, Math.sin(a) * r);
    t.rotation.x = -a;
  }
  for (const side of [1, -1]) {
    const rim = new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.04, 14);
    rim.rotateZ(Math.PI / 2);
    add(g, rim, MAT.rim, (side * width) / 2, 0, 0);
    const hub = new THREE.CylinderGeometry(r * 0.18, r * 0.22, 0.08, 8);
    hub.rotateZ(Math.PI / 2);
    add(g, hub, MAT.steel, (side * (width / 2 + 0.04)), 0, 0);
  }
  return g;
}

/** Cab with windows on every side, a roof visor, lights, mirrors and a beacon. */
function cabMesh(root: THREE.Object3D, v: Vehicle, baseY: number, opts: { frontLights: boolean }) {
  const c = v.cab;
  const w = c.halfWidth * 2;
  const d = c.halfLength * 2;
  const lowH = c.height * 0.45;
  box(root, w, lowH, d, MAT.paint, 0, baseY + lowH / 2, c.z);
  // Glass house: slightly narrower, with posts at the corners.
  const glassH = c.height * 0.45;
  const gy = baseY + lowH + glassH / 2;
  box(root, w * 0.94, glassH, d * 0.94, MAT.glass, 0, gy, c.z);
  for (const sx of [1, -1]) for (const sz of [1, -1]) box(root, 0.09, glassH, 0.09, MAT.paint, (sx * w * 0.47), gy, c.z + sz * d * 0.47);
  // Roof with an overhanging visor at the front.
  const roofY = baseY + lowH + glassH + 0.05;
  box(root, w * 1.04, 0.1, d * 1.12, MAT.paint, 0, roofY, c.z + d * 0.04);
  add(root, new THREE.CylinderGeometry(0.09, 0.11, 0.16, 10), MAT.beacon, w * 0.3, roofY + 0.13, c.z);
  // Mirrors on arms.
  for (const sx of [1, -1]) {
    box(root, 0.35, 0.04, 0.04, MAT.frame, sx * (w / 2 + 0.17), gy, c.z + d / 2 - 0.05);
    box(root, 0.06, 0.28, 0.16, MAT.frame, sx * (w / 2 + 0.36), gy, c.z + d / 2 - 0.05);
  }
  if (opts.frontLights)
    for (const sx of [1, -1]) box(root, 0.28, 0.16, 0.05, MAT.headlight, sx * (w / 2 - 0.25), baseY + lowH * 0.45, c.z + d / 2 + 0.03);
}

function boxesMesh(boxes: Box[], material: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (const b of boxes) box(g, b.hx * 2, b.hy * 2, b.hz * 2, material, b.x, b.y, b.z);
  return g;
}

/** Low-poly vehicle built from the physics config, so the visuals always match the collision shapes. */
export function createVehicleMesh(v: Vehicle): VehicleMesh {
  const h = v.config.halfExtents;
  const r = v.config.wheelRadius;
  const root = new THREE.Group();
  const loader = v.info.kind === 'loader';
  const top = h.y;
  const wheelX = Math.max(...v.config.wheels.map((w) => Math.abs(w.x)));
  const innerX = wheelX - v.config.wheelWidth / 2 - 0.05;
  if (v.info.kind === 'excavator') return excavatorMesh(v, root);

  // Frame rails and a deck between the wheels, instead of one big block.
  for (const sx of [1, -1]) box(root, 0.22, h.y * 1.2, h.z * 2, MAT.frame, sx * innerX * 0.6, -h.y * 0.2, 0);
  box(root, innerX * 2, 0.18, h.z * 2, MAT.frame, 0, top - 0.09, 0);

  // Mudguards above each wheel.
  for (const wh of v.config.wheels) {
    const g = box(root, v.config.wheelWidth + 0.12, 0.08, r * 1.5, MAT.paintDark, wh.x, top - h.y + r * 0.95 - 0.1, wh.z);
    g.position.y = Math.max(g.position.y, top - 0.04);
  }

  // Bumpers with hazard stripes and lights.
  const front = h.z;
  const back = -h.z;
  box(root, h.x * 2, 0.32, 0.22, MAT.frame, 0, -h.y * 0.35, front + 0.08);
  for (let i = -2; i <= 2; i++) box(root, 0.22, 0.3, 0.02, i % 2 ? MAT.stripe : MAT.paint, i * h.x * 0.36, -h.y * 0.35, front + 0.2);
  box(root, h.x * 2, 0.28, 0.18, MAT.frame, 0, -h.y * 0.35, back - 0.06);
  for (const sx of [1, -1]) box(root, 0.3, 0.14, 0.04, MAT.taillight, sx * (h.x - 0.25), -h.y * 0.35, back - 0.17);

  if (loader) {
    // Articulated loader: engine hood and counterweight at the back, cab in the middle, lights on the hood.
    const hoodLen = h.z + v.cab.z - v.cab.halfLength;
    box(root, h.x * 1.6, 0.8, hoodLen, MAT.paint, 0, top + 0.4, back + hoodLen / 2);
    for (let i = 0; i < 5; i++) box(root, h.x * 1.2, 0.04, 0.06, MAT.frame, 0, top + 0.81, back + 0.3 + i * 0.22);
    box(root, h.x * 1.9, 0.6, 0.35, MAT.frame, 0, top + 0.2, back - 0.05);
    add(root, new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), MAT.frame, h.x * 0.45, top + 1.1, back + hoodLen * 0.6);
    for (const sx of [1, -1]) box(root, 0.22, 0.16, 0.05, MAT.headlight, sx * h.x * 0.5, top + 0.6, back + hoodLen + 0.01);
    cabMesh(root, v, top, { frontLights: true });
    // Hydraulic rams toward the arm.
    for (const sx of [1, -1]) {
      const ram = add(root, new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), MAT.steel, sx * 0.85, top + 0.3, front - 0.4);
      ram.rotation.x = Math.PI / 2.6;
    }
  } else {
    cabMesh(root, v, top, { frontLights: false });
    const c = v.cab;
    // Grille and headlights on the nose, exhaust stack behind the cab.
    box(root, c.halfWidth * 1.6, 0.5, 0.05, MAT.frame, 0, top + 0.3, front + 0.01);
    for (let i = 0; i < 4; i++) box(root, c.halfWidth * 1.5, 0.04, 0.06, MAT.steel, 0, top + 0.12 + i * 0.12, front + 0.03);
    for (const sx of [1, -1]) box(root, 0.3, 0.18, 0.06, MAT.headlight, sx * (h.x - 0.3), top + 0.25, front + 0.03);
    const stackZ = c.z - c.halfLength - 0.15;
    add(root, new THREE.CylinderGeometry(0.08, 0.09, c.height + 0.4, 10), MAT.steel, c.halfWidth - 0.15, top + (c.height + 0.4) / 2, stackZ);
    // Side step under the cab door.
    for (const sx of [1, -1]) box(root, 0.3, 0.05, 0.5, MAT.steel, sx * (h.x + 0.05), top - 0.25, c.z);
  }

  const wheels = v.config.wheels.map(() => wheelMesh(r, v.config.wheelWidth));

  const parts = partMeshes(v, loader);
  return meshResult(root, wheels, parts);
}

function partMeshes(v: Vehicle, loader: boolean): THREE.Group[] {
  return v.parts.map((p) => {
    const mat = new THREE.MeshStandardMaterial({ color: p.color, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.2 });
    const g = boxesMesh(p.boxes, mat);
    // Ribs on the outside of a dump bed's side walls (boxes 1 and 2 are the side walls).
    if (!loader && p.toggleBox) {
      for (const wall of [p.boxes[1]!, p.boxes[2]!]) {
        const out = Math.sign(wall.x) * (wall.hx + 0.04);
        for (let i = -2; i <= 2; i++)
          box(g, 0.08, wall.hy * 2, 0.12, MAT.paintDark, wall.x + out, wall.y, (i * wall.hz) / 2.5);
        box(g, 0.1, 0.1, wall.hz * 2, MAT.paintDark, wall.x + out, wall.y + wall.hy, 0);
      }
    }
    return g;
  });
}

function meshResult(root: THREE.Group, wheels: THREE.Object3D[], parts: THREE.Group[]): VehicleMesh {
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

/**
 * Excavator: crawler tracks on the base (the physics wheels hide inside them), and the house,
 * boom, stick and bucket decorated on their own part groups so they swing with the arm.
 */
function excavatorMesh(v: Vehicle, root: THREE.Group): VehicleMesh {
  const h = v.config.halfExtents;
  const r = v.config.wheelRadius;
  const wheelX = Math.max(...v.config.wheels.map((w) => Math.abs(w.x)));
  const tw = v.config.wheelWidth + 0.1;
  // Wheel centers sit about one suspension length below the chassis connection points.
  const cy = -h.y - v.config.suspensionRest + 0.1;
  const len = h.z * 2 + r * 1.2;
  box(root, (wheelX - tw / 2) * 2, h.y * 1.4, h.z * 1.6, MAT.frame, 0, 0, 0); // car body
  add(root, new THREE.CylinderGeometry(0.8, 0.9, 0.3, 16), MAT.frame, 0, h.y + 0.1, 0); // slewing ring
  for (const sx of [1, -1]) {
    const x = sx * wheelX;
    box(root, tw, r * 2 + 0.16, len - r * 1.6, MAT.tire, x, cy, 0);
    for (const sz of [1, -1]) {
      const end = new THREE.CylinderGeometry(r + 0.08, r + 0.08, tw, 14, 1, false, 0, Math.PI);
      end.rotateZ(Math.PI / 2);
      const m = add(root, end, MAT.tire, x, cy, sz * (len / 2 - r * 0.8));
      m.rotation.x = sz > 0 ? 0 : Math.PI;
    }
    // Track shoes along the top and bottom, plus the side frame with rollers.
    for (let z = -len / 2 + r; z <= len / 2 - r; z += 0.3) {
      box(root, tw + 0.02, 0.06, 0.12, MAT.stripe, x, cy + r + 0.09, z);
      box(root, tw + 0.02, 0.06, 0.12, MAT.stripe, x, cy - r - 0.09, z);
    }
    box(root, 0.06, r * 1.1, len - r * 2.4, MAT.paintDark, x + sx * (tw / 2 + 0.03), cy, 0);
    for (let i = -2; i <= 2; i++) {
      const roller = new THREE.CylinderGeometry(0.13, 0.13, 0.04, 10);
      roller.rotateZ(Math.PI / 2);
      add(root, roller, MAT.steel, x + sx * (tw / 2 + 0.07), cy - r * 0.35, i * (len - r * 2.4) * 0.2);
    }
  }
  // The physics wheels still drive the excavator; they are just not drawn.
  const wheels = v.config.wheels.map(() => new THREE.Group());

  const parts = v.parts.map((p) => boxesMesh(p.boxes, new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.6, metalness: 0.2 })));
  const [house, boom, stick] = parts as [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  const [, , cab] = v.parts[0]!.boxes as [Box, Box, Box];
  // Cab windows, roof, handrails, engine grille, exhaust and a beacon on the house.
  box(house, cab.hx * 2 + 0.02, cab.hy * 1.0, cab.hz * 1.7, MAT.glass, cab.x, cab.y + cab.hy * 0.25, cab.z);
  box(house, cab.hx * 1.7, cab.hy * 1.0, 0.04, MAT.glass, cab.x, cab.y + cab.hy * 0.25, cab.z + cab.hz + 0.01);
  box(house, cab.hx * 2.1, 0.08, cab.hz * 2.15, MAT.paint, cab.x, cab.y + cab.hy + 0.04, cab.z);
  add(house, new THREE.CylinderGeometry(0.08, 0.1, 0.15, 10), MAT.beacon, cab.x, cab.y + cab.hy + 0.15, cab.z - 0.2);
  for (let i = 0; i < 5; i++) box(house, 1.2, 0.04, 0.07, MAT.frame, -0.5, 0.61, -0.9 - i * 0.2);
  add(house, new THREE.CylinderGeometry(0.07, 0.08, 0.7, 10), MAT.steel, -0.8, 0.95, -0.6);
  for (let i = -3; i <= 3; i++) box(house, 0.18, 0.3, 0.02, i % 2 ? MAT.stripe : MAT.paint, i * 0.34, 0.5, -1.96);
  box(house, 0.04, 0.5, 1.8, MAT.steel, -1.22, 0.85, -0.6);
  // Hydraulic cylinders along the top of the boom and the stick.
  const ram = (g: THREE.Group, length: number, y: number, z0: number) => {
    const body = new THREE.CylinderGeometry(0.11, 0.11, length * 0.55, 10);
    body.rotateX(Math.PI / 2);
    add(g, body, MAT.paintDark, 0, y, z0 + length * 0.3);
    const rod = new THREE.CylinderGeometry(0.05, 0.05, length * 0.4, 8);
    rod.rotateX(Math.PI / 2);
    add(g, rod, MAT.steel, 0, y, z0 + length * 0.75);
  };
  const boomLen = v.parts[1]!.boxes[0]!.hz * 2;
  const stickLen = v.parts[2]!.boxes[0]!.hz * 2;
  ram(boom, boomLen, 0.4, 0);
  ram(stick, stickLen, 0.3, -0.2);
  return meshResult(root, wheels, parts);
}
