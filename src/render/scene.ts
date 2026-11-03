import * as THREE from 'three';
import { BERM_HEIGHT, MAP_HALF_SIZE } from '../physics/world';

export interface SceneHandles {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Keep the shadow area centered on the truck. */
  followSun(target: THREE.Vector3): void;
  /** Bright midday or a low orange evening sun with headlights. */
  setTimeOfDay(t: 'day' | 'evening'): void;
  /** Point the headlight beam (only lit in the evening) from a vehicle's nose. */
  aimHeadlights(from: THREE.Vector3, to: THREE.Vector3): void;
}

const SKY = {
  day: { sky: 0x87b5d9, sun: 0xffffff, sunI: 1.6, sunPos: [20, 30, 10], hemiSky: 0xffffff, hemiGround: 0x8a7350, hemiI: 0.8, beam: 0 },
  evening: { sky: 0xe39a6c, sun: 0xffad6b, sunI: 1.3, sunPos: [-35, 12, -18], hemiSky: 0xffcfae, hemiGround: 0x5a4650, hemiI: 0.62, beam: 60 },
} as const;

export function createScene(container: HTMLElement): SceneHandles {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5d9);
  scene.fog = new THREE.Fog(0x87b5d9, 60, 200);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
  camera.position.set(8, 6, 10);
  camera.lookAt(0, 1, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7350, 0.8);
  scene.add(hemi);
  const beam = new THREE.SpotLight(0xfff0c8, 0, 40, 0.5, 0.6, 1.2);
  scene.add(beam, beam.target);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  // Tight shadow box that follows the truck (see followSun): sharp, and no acne stripes crawling on the ground.
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -25;
  sun.shadow.camera.right = sun.shadow.camera.top = 25;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  // Ground, pit and rocks are per level: see render/levelMesh.ts.
  const bermMat = new THREE.MeshStandardMaterial({ color: 0x9c7a45 });
  const e = MAP_HALF_SIZE;
  for (const [x, z, w, d] of [[0, e, e * 2, 2], [0, -e, e * 2, 2], [e, 0, 2, e * 2], [-e, 0, 2, e * 2]] as const) {
    const berm = new THREE.Mesh(new THREE.BoxGeometry(w, BERM_HEIGHT, d), bermMat);
    berm.position.set(x, BERM_HEIGHT / 2, z);
    berm.castShadow = berm.receiveShadow = true;
    scene.add(berm);
  }

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  let sunOffset = sun.position.clone();
  // Snap to whole shadow-map texels so shadow edges do not swim while moving.
  const texel = 50 / 2048;
  const snap = (v: number) => Math.round(v / texel) * texel;
  function followSun(target: THREE.Vector3) {
    sun.target.position.set(snap(target.x), 0, snap(target.z));
    sun.position.copy(sun.target.position).add(sunOffset);
  }

  function setTimeOfDay(t: 'day' | 'evening') {
    const c = SKY[t];
    (scene.background as THREE.Color).set(c.sky);
    (scene.fog as THREE.Fog).color.set(c.sky);
    sun.color.set(c.sun);
    sun.intensity = c.sunI;
    sunOffset = new THREE.Vector3(...c.sunPos);
    hemi.color.set(c.hemiSky);
    hemi.groundColor.set(c.hemiGround);
    hemi.intensity = c.hemiI;
    beam.intensity = c.beam;
  }
  function aimHeadlights(from: THREE.Vector3, to: THREE.Vector3) {
    beam.position.copy(from);
    beam.target.position.copy(to);
  }

  return { renderer, scene, camera, followSun, setTimeOfDay, aimHeadlights };
}
