import * as THREE from 'three';
import type { TrackSegment } from '../core/tireTracks';

/** Dark, see-through quads on the ground along the wheel paths; older marks are fainter. */
export function createTireTrackMesh(capacity: number) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(capacity * 4 * 3);
  const alpha = new Float32Array(capacity * 4);
  const index: number[] = [];
  for (let i = 0; i < capacity; i++) {
    const o = i * 4;
    index.push(o, o + 1, o + 2, o + 2, o + 1, o + 3);
  }
  geo.setIndex(index);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() { gl_FragColor = vec4(0.32, 0.24, 0.14, vAlpha * 0.35); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide, // quads are wound either way depending on the driving direction
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  let seen = -1;
  return {
    mesh,
    sync(segments: TrackSegment[], version: number) {
      if (version === seen) return;
      seen = version;
      const n = segments.length;
      segments.forEach((s, i) => {
        const dx = s.bx - s.ax;
        const dz = s.bz - s.az;
        const len = Math.hypot(dx, dz) || 1;
        // Sideways half-width vector.
        const nx = (-dz / len) * (s.width / 2);
        const nz = (dx / len) * (s.width / 2);
        const y = s.y + 0.02;
        const a = 0.25 + 0.75 * ((i + 1) / n);
        const o = i * 12;
        pos.set([s.ax + nx, y, s.az + nz, s.ax - nx, y, s.az - nz, s.bx + nx, y, s.bz + nz, s.bx - nx, y, s.bz - nz], o);
        alpha.fill(a, i * 4, i * 4 + 4);
      });
      geo.setDrawRange(0, n * 6);
      geo.getAttribute('position').needsUpdate = true;
      geo.getAttribute('alpha').needsUpdate = true;
    },
  };
}
