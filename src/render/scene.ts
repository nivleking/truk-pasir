import * as THREE from 'three';

export interface SceneHandles {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  placeholderTruck: THREE.Mesh;
}

export function createScene(container: HTMLElement): SceneHandles {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5d9);
  scene.fog = new THREE.Fog(0x87b5d9, 60, 200);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
  camera.position.set(8, 6, 10);
  camera.lookAt(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7350, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xc9a66b }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Placeholder until Fase 1 brings the real (physics) truck.
  const placeholderTruck = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.6, 5),
    new THREE.MeshStandardMaterial({ color: 0xe8b923 }),
  );
  placeholderTruck.position.y = 0.8;
  placeholderTruck.castShadow = true;
  scene.add(placeholderTruck);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return { renderer, scene, camera, placeholderTruck };
}
