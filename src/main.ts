import * as THREE from 'three';
import { chaseOffset, followFactor } from './core/chaseCam';
import { isOutOfBounds } from './core/drive';
import { createFixedStep } from './core/fixedStep';
import { commandsFromKeys, smoothSteer } from './core/input';
import { createTruck } from './physics/truck';
import { createWorld } from './physics/world';
import { createScene } from './render/scene';
import { createTruckMesh } from './render/truckMesh';

const STEP = 1 / 60;

async function start() {
  const container = document.getElementById('app');
  const hud = document.getElementById('hud');
  if (!container || !hud) throw new Error('#app/#hud not found');

  const { renderer, scene, camera, followSun } = createScene(container);
  const { rapier, world } = await createWorld();
  world.timestep = STEP;
  const truck = createTruck(rapier, world);
  const mesh = createTruckMesh();
  scene.add(mesh.root, ...mesh.wheels);

  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'KeyR') resetTruck();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  function resetTruck() {
    truck.body.setTranslation({ x: 0, y: 2, z: 0 }, true);
    truck.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    truck.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    truck.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    readBody(currPos, currQuat);
    prevPos.copy(currPos);
    prevQuat.copy(currQuat);
  }

  const loop = createFixedStep(STEP);
  let steer = 0;
  let last = performance.now();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const camTarget = new THREE.Vector3();
  const prevPos = new THREE.Vector3();
  const currPos = new THREE.Vector3();
  const prevQuat = new THREE.Quaternion();
  const currQuat = new THREE.Quaternion();
  function readBody(pos: THREE.Vector3, q: THREE.Quaternion) {
    const t = truck.body.translation();
    const r = truck.body.rotation();
    pos.set(t.x, t.y, t.z);
    q.set(r.x, r.y, r.z, r.w);
  }
  readBody(currPos, currQuat);
  prevPos.copy(currPos);
  prevQuat.copy(currQuat);

  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;

    const cmd = commandsFromKeys(keys);
    const steps = loop.advance(dt);
    for (let i = 0; i < steps; i++) {
      prevPos.copy(currPos);
      prevQuat.copy(currQuat);
      steer = smoothSteer(steer, cmd.steer, STEP, 2.5);
      truck.apply(cmd, steer);
      truck.controller.updateVehicle(STEP);
      world.step();
      readBody(currPos, currQuat);
    }

    const p = truck.body.translation();
    if (isOutOfBounds(p)) resetTruck();
    // Render between the last two physics states so motion is smooth at any refresh rate.
    const alpha = loop.alpha();
    mesh.root.position.lerpVectors(prevPos, currPos, alpha);
    quat.slerpQuaternions(prevQuat, currQuat, alpha);
    mesh.root.quaternion.copy(quat);

    mesh.wheels.forEach((w, i) => {
      const c = truck.controller.wheelChassisConnectionPointCs(i);
      const susp = truck.controller.wheelSuspensionLength(i) ?? 0;
      if (!c) return;
      w.position.set(c.x, c.y - susp, c.z).applyQuaternion(quat).add(mesh.root.position);
      w.quaternion.copy(quat);
      w.rotateY(truck.controller.wheelSteering(i) ?? 0);
      w.rotateX(truck.controller.wheelRotation(i) ?? 0);
    });

    euler.setFromQuaternion(quat, 'YXZ');
    const desired = chaseOffset(mesh.root.position, euler.y, 11, 5);
    camera.position.lerp(camTarget.set(desired.x, desired.y, desired.z), followFactor(dt, 4));
    camera.lookAt(mesh.root.position.x, mesh.root.position.y + 1.2, mesh.root.position.z);

    hud.textContent = `${Math.abs(truck.speedKmh()).toFixed(0)} km/j  ·  WASD jalan · Spasi rem · R reset`;
    followSun(mesh.root.position);
    renderer.render(scene, camera);
  });
}

start();
