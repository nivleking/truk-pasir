import * as THREE from 'three';
import { chaseOffset, followFactor } from './core/chaseCam';
import { isOutOfBounds } from './core/drive';
import { createDumpBed } from './core/dumpBed';
import { createFixedStep } from './core/fixedStep';
import { createHopper, isUnder } from './core/hopper';
import { commandsFromKeys, smoothSteer } from './core/input';
import { createRound, type RoundState } from './core/round';
import { BED, createBed } from './physics/bed';
import { createHopperStructure, HOPPER, spoutPosition } from './physics/hopperStructure';
import { createSandPool } from './physics/sand';
import { createTruck } from './physics/truck';
import { createWorld } from './physics/world';
import { createBedMesh } from './render/bedMesh';
import { createHopperMesh } from './render/hopperMesh';
import { createSandMesh } from './render/sandMesh';
import { createScene } from './render/scene';
import { createTruckMesh } from './render/truckMesh';
import { createZoneMesh } from './render/zoneMesh';

const STEP = 1 / 60;
const DUMP_ANGLE = 25;
/** Dump zone (zona tuang). */
const ZONE = { x: 26, z: -20, radius: 4 };

const STATE_TEXT: Record<RoundState, string> = {
  ready: 'Isi pasir: berhenti dengan bak di bawah corong',
  loading: 'Mengisi pasir...',
  hauling: 'Mundur ke zona hijau (pasir keluar dari belakang), lalu angkat bak (E)',
  dumping: 'Menuang! Turunkan bak (Q) kalau sudah kosong',
  settling: 'Menghitung pasir...',
  finished: 'Selesai!',
};

/** Previous + current physics pose of a body, so rendering can interpolate between steps. */
function createPoseTracker(read: () => { t: RAPIER_Vec; r: RAPIER_Quat }) {
  const prevPos = new THREE.Vector3();
  const currPos = new THREE.Vector3();
  const prevQuat = new THREE.Quaternion();
  const currQuat = new THREE.Quaternion();
  const sample = () => {
    const { t, r } = read();
    currPos.set(t.x, t.y, t.z);
    currQuat.set(r.x, r.y, r.z, r.w);
  };
  return {
    beforeStep() {
      prevPos.copy(currPos);
      prevQuat.copy(currQuat);
    },
    afterStep: sample,
    snap() {
      sample();
      prevPos.copy(currPos);
      prevQuat.copy(currQuat);
    },
    apply(obj: THREE.Object3D, alpha: number) {
      obj.position.lerpVectors(prevPos, currPos, alpha);
      obj.quaternion.slerpQuaternions(prevQuat, currQuat, alpha);
    },
  };
}
type RAPIER_Vec = { x: number; y: number; z: number };
type RAPIER_Quat = RAPIER_Vec & { w: number };

async function start() {
  const container = document.getElementById('app');
  const hud = document.getElementById('hud');
  const status = document.getElementById('status');
  const resultBox = document.getElementById('result');
  if (!container || !hud || !status || !resultBox) throw new Error('HUD elements not found');

  const { renderer, scene, camera, followSun } = createScene(container);
  const { rapier, world } = await createWorld();
  world.timestep = STEP;

  const truck = createTruck(rapier, world);
  const bed = createBed(rapier, world, truck.body);
  createHopperStructure(rapier, world);
  const sand = createSandPool(rapier, world);

  const truckMesh = createTruckMesh();
  const bedMesh = createBedMesh();
  const sandMesh = createSandMesh();
  scene.add(
    truckMesh.root,
    ...truckMesh.wheels,
    bedMesh,
    sandMesh.mesh,
    createHopperMesh(),
    createZoneMesh(ZONE, ZONE.radius),
  );

  const dumpBed = createDumpBed({ maxAngle: 50, speed: 18 });
  const LOAD_CAPACITY = 220;
  const hopper = createHopper({ rate: 50, capacity: LOAD_CAPACITY });
  const spout = spoutPosition();
  const round = createRound({ dumpAngle: DUMP_ANGLE, settleSeconds: 1.5 });
  let loadedThisRound = 0;

  const countDelivered = () => {
    let n = 0;
    for (const g of sand.grains) {
      if (!g.isEnabled()) continue;
      const t = g.translation();
      if (t.y < 2 && Math.hypot(t.x - ZONE.x, t.z - ZONE.z) <= ZONE.radius) n++;
    }
    return n;
  };

  const truckPose = createPoseTracker(() => ({ t: truck.body.translation(), r: truck.body.rotation() }));
  const bedPose = createPoseTracker(() => ({ t: bed.body.translation(), r: bed.body.rotation() }));

  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'KeyR') resetAll();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const resetAll = () => {
    const still = { x: 0, y: 0, z: 0 };
    const identity = { x: 0, y: 0, z: 0, w: 1 };
    for (const [body, pos] of [
      [truck.body, { x: 0, y: 2, z: 0 }],
      [bed.body, { x: BED.offset.x, y: 2 + BED.offset.y, z: BED.offset.z }],
    ] as const) {
      body.setTranslation(pos, true);
      body.setRotation(identity, true);
      body.setLinvel(still, true);
      body.setAngvel(still, true);
    }
    dumpBed.update(1000, -1);
    sand.clear();
    round.reset();
    loadedThisRound = 0;
    resultBox.hidden = true;
    truckPose.snap();
    bedPose.snap();
  };
  truckPose.snap();
  bedPose.snap();

  const loop = createFixedStep(STEP);
  let steer = 0;
  let last = performance.now();
  const euler = new THREE.Euler();
  const camTarget = new THREE.Vector3();
  const jitter = () => (Math.random() - 0.5) * 0.5;

  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;

    const cmd = commandsFromKeys(keys);
    const steps = loop.advance(dt);
    for (let i = 0; i < steps; i++) {
      truckPose.beforeStep();
      bedPose.beforeStep();

      steer = smoothSteer(steer, cmd.steer, STEP, 2.5);
      truck.apply(cmd, steer);
      dumpBed.update(STEP, cmd.bed);
      bed.setAngle(dumpBed.angle);

      const canLoad = (round.state === 'ready' || round.state === 'loading') && loadedThisRound < LOAD_CAPACITY;
      const under = canLoad && isUnder(bed.body.translation(), spout, HOPPER.zoneRadius) && Math.abs(truck.speedKmh()) < 3;
      const n = hopper.update(STEP, under);
      for (let k = 0; k < n; k++) if (sand.spawn({ x: spout.x + jitter(), y: spout.y, z: spout.z + jitter() })) loadedThisRound++;

      truck.controller.updateVehicle(STEP);
      world.step();
      sand.recycle();

      const bedPos = bed.body.translation();
      round.update(STEP, {
        loaded: loadedThisRound,
        delivered: round.state === 'settling' ? countDelivered() : 0,
        bedUnderHopper: isUnder(bedPos, spout, HOPPER.zoneRadius),
        bedInZone: Math.hypot(bedPos.x - ZONE.x, bedPos.z - ZONE.z) <= ZONE.radius + 1,
        bedAngle: dumpBed.angle,
      });

      truckPose.afterStep();
      bedPose.afterStep();
    }

    if (isOutOfBounds(truck.body.translation())) resetAll();

    const alpha = loop.alpha();
    truckPose.apply(truckMesh.root, alpha);
    bedPose.apply(bedMesh, alpha);
    sandMesh.sync(sand.grains);

    const root = truckMesh.root;
    truckMesh.wheels.forEach((w, i) => {
      const c = truck.controller.wheelChassisConnectionPointCs(i);
      const susp = truck.controller.wheelSuspensionLength(i) ?? 0;
      if (!c) return;
      w.position.set(c.x, c.y - susp, c.z).applyQuaternion(root.quaternion).add(root.position);
      w.quaternion.copy(root.quaternion);
      w.rotateY(truck.controller.wheelSteering(i) ?? 0);
      w.rotateX(truck.controller.wheelRotation(i) ?? 0);
    });

    euler.setFromQuaternion(root.quaternion, 'YXZ');
    const desired = chaseOffset(root.position, euler.y, 11, 5);
    camera.position.lerp(camTarget.set(desired.x, desired.y, desired.z), followFactor(dt, 4));
    camera.lookAt(root.position.x, root.position.y + 1.2, root.position.z);

    const speed = Math.abs(truck.speedKmh()).toFixed(0);
    hud.textContent =
      `${speed} km/j · bak ${dumpBed.angle.toFixed(0)}°` +
      `  |  WASD jalan · Spasi rem · E/Q angkat/turunkan bak · R ulang`;
    status.textContent = `⏱ ${round.seconds.toFixed(1)} s · muatan ${loadedThisRound} · ${STATE_TEXT[round.state]}`;
    if (round.result && resultBox.hidden) {
      const r = round.result;
      resultBox.innerHTML =
        `<div class="rank">${r.rank}</div>` +
        `<div>${r.percent}% pasir sampai · ${round.seconds.toFixed(1)} s</div>` +
        `<div>Skor ${r.total} <small>(${r.percent * 10} + bonus waktu ${r.timeBonus})</small></div>` +
        `<div class="hint">Tekan R untuk main lagi</div>`;
      resultBox.hidden = false;
    }

    followSun(root.position);
    renderer.render(scene, camera);
  });
}

start();
