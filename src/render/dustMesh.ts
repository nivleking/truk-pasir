import * as THREE from 'three';
import type { Particle } from '../core/particles';

/** Soft round dust puffs drawn as points that grow and fade (see core/particles). */
export function createDustMesh(capacity: number) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(capacity * 3);
  const size = new Float32Array(capacity);
  const alpha = new Float32Array(capacity);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0xc8a874) }, scale: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float alpha;
      uniform float scale;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.2, d) * vAlpha * 0.45;
        if (a < 0.01) discard;
        gl_FragColor = vec4(color, a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return {
    points,
    /** Keep the point size right when the canvas changes height. */
    setViewHeight(px: number) {
      material.uniforms.scale!.value = px * 0.8;
    },
    setColor(c: number) {
      (material.uniforms.color!.value as THREE.Color).set(c);
    },
    sync(items: Particle[], count: number) {
      for (let i = 0; i < count; i++) {
        const p = items[i]!;
        pos[i * 3] = p.x;
        pos[i * 3 + 1] = p.y;
        pos[i * 3 + 2] = p.z;
        size[i] = p.size;
        alpha[i] = p.alpha;
      }
      geo.setDrawRange(0, count);
      for (const a of ['position', 'size', 'alpha']) geo.getAttribute(a).needsUpdate = true;
    },
  };
}
