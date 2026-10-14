import { createFixedStep } from './core/fixedStep';
import { createScene } from './render/scene';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

const { renderer, scene, camera, placeholderTruck } = createScene(container);
const loop = createFixedStep(1 / 60);

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = (now - last) / 1000;
  last = now;

  const steps = loop.advance(dt);
  for (let i = 0; i < steps; i++) {
    placeholderTruck.rotation.y += 0.01; // stand-in for physics step
  }

  renderer.render(scene, camera);
});
