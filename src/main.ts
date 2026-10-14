import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { generateBumps } from './core/bumps';
import { createOrbit } from './core/orbit';
import { chaseOffset, followFactor, smoothAngle } from './core/chaseCam';
import { isOutOfBounds } from './core/drive';
import { createFixedStep } from './core/fixedStep';
import { addScore, sanitizeName } from './core/highScores';
import { createHopper, isUnder } from './core/hopper';
import { findLevel, inPit, isUnlocked, LEVELS, PIT, recordStars, starsFor, type Level } from './core/levels';
import { commandsFromKeys, smoothSteer, type DriveCommands } from './core/input';
import { createRound, type RoundState } from './core/round';
import { findVehicle, teamFor, type VehicleId } from './core/vehicles';
import { createMenu } from './menu';
import { HOPPER, spoutPosition } from './physics/hopperStructure';
import { createLevelPhysics } from './physics/level';
import { createSandPool } from './physics/sand';
import type { Vehicle } from './physics/vehicle';
import { createVehicle } from './physics/vehicles';
import { createWorld, MAP_HALF_SIZE } from './physics/world';
import { createSandMesh } from './render/sandMesh';
import { createScene } from './render/scene';
import { createVehicleMesh, type VehicleMesh } from './render/vehicleMesh';
import { createLevelMesh } from './render/levelMesh';
import {
  loadHelper,
  loadLevel,
  loadName,
  loadProgress,
  loadScores,
  loadVehicle,
  saveHelper,
  saveLevel,
  saveName,
  saveProgress,
  saveScores,
  saveVehicle,
} from './storage';

const STEP = 1 / 60;
const IDLE: DriveCommands = { throttle: 0, steer: 0, handbrake: true, bed: 0, tilt: 0 };
const DUMP_ANGLE = 25;

function stateText(state: RoundState, v: Vehicle): string {
  switch (state) {
    case 'ready':
      return v.info.kind === 'loader'
        ? 'Isi pasir: angkat lengan (E) dan berhenti dengan sendok di bawah corong'
        : 'Isi pasir: berhenti dengan bak di bawah corong';
    case 'loading':
      return 'Mengisi pasir...';
    case 'hauling':
      return v.hints.hauling;
    case 'dumping':
      return v.hints.dumping;
    case 'settling':
      return 'Menghitung pasir...';
    case 'finished':
      return 'Selesai!';
  }
}

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

  const sand = createSandPool(rapier, world);
  const sandMesh = createSandMesh();
  scene.add(sandMesh.mesh);

  // ---- Level: ground with dump pit, obstacles, hopper, bumps. Rebuilt when another level is picked. ----
  let level = findLevel(loadLevel());
  let levelPhysics: { dispose(): void } | null = null;
  let levelMesh: { dispose(): void } | null = null;
  let spout = spoutPosition(level.hopper);
  function useLevel(next: Level) {
    if (levelPhysics && next.id === level.id) return;
    levelPhysics?.dispose();
    levelMesh?.dispose();
    level = next;
    const bumps = generateBumps({
      ...level.bumps,
      from: level.hopper,
      to: level.pit,
      keepClear: [
        { ...level.hopper, radius: 8 },
        { ...level.pit, radius: PIT.half + 6 },
        { ...level.spawn, radius: 12 },
        ...level.obstacles.map((o) => ({ x: o.x, z: o.z, radius: Math.hypot(o.hx, o.hz) + 2 })),
      ],
    });
    levelPhysics = createLevelPhysics(rapier, world, level, bumps);
    const lm = createLevelMesh(level, bumps);
    scene.add(lm.group);
    levelMesh = lm;
    spout = spoutPosition(level.hopper);
    for (const s of slots) s.home = homeFor(slots.indexOf(s));
  }
  const homeFor = (i: number) => ({ x: level.spawn.x - 8 * i, z: level.spawn.z });

  let round = createRound({ dumpAngle: DUMP_ANGLE, settleSeconds: 1.5 });
  let loadedThisRound = 0;

  const countDelivered = () => {
    let n = 0;
    for (const g of sand.grains) if (g.isEnabled() && inPit(g.translation(), level.pit)) n++;
    return n;
  };

  // ---- Vehicles on the map: the chosen one (slot 0) plus an optional helper loader ----
  type Tracker = ReturnType<typeof createPoseTracker>;
  const trackerFor = (b: RAPIER.RigidBody) => createPoseTracker(() => ({ t: b.translation(), r: b.rotation() }));
  interface Slot {
    vehicle: Vehicle;
    mesh: VehicleMesh;
    chassisPose: Tracker;
    partPoses: Tracker[];
    steer: number;
    /** Spawn spot on the ground plane. */
    home: { x: number; z: number };
  }
  let slots: Slot[] = [];
  let active = 0;
  let teamKey = '';
  let hopper = createHopper({ rate: 50, capacity: 1 });
  const main = () => slots[0]!;
  const current = () => slots[active]!;

  function useTeam(ids: VehicleId[]) {
    const key = ids.join('+');
    if (key === teamKey) return;
    teamKey = key;
    for (const s of slots) {
      for (const p of s.vehicle.parts) world.removeRigidBody(p.body);
      world.removeVehicleController(s.vehicle.chassis.controller);
      world.removeRigidBody(s.vehicle.chassis.body);
      s.mesh.dispose();
    }
    slots = ids.map((id, i) => {
      const vehicle = createVehicle(rapier, world, findVehicle(id));
      const mesh = createVehicleMesh(vehicle);
      scene.add(mesh.root, ...mesh.wheels, ...mesh.parts);
      return {
        vehicle,
        mesh,
        chassisPose: trackerFor(vehicle.chassis.body),
        partPoses: vehicle.parts.map((p) => trackerFor(p.body)),
        steer: 0,
        home: homeFor(i),
      };
    });
    active = 0;
    hopper = createHopper({ rate: 50, capacity: main().vehicle.info.capacity });
    round = createRound({ dumpAngle: DUMP_ANGLE, settleSeconds: 1.5, manualFinish: slots.length > 1 });
  }

  const placeSlot = (s: Slot) => {
    const still = { x: 0, y: 0, z: 0 };
    const identity = { x: 0, y: 0, z: 0, w: 1 };
    const y = s.vehicle.chassis.spawnY;
    const place = (b: RAPIER.RigidBody, o: RAPIER.Vector) => {
      b.setTranslation({ x: s.home.x + o.x, y: y + o.y, z: s.home.z + o.z }, true);
      b.setRotation(identity, true);
      b.setLinvel(still, true);
      b.setAngvel(still, true);
    };
    place(s.vehicle.chassis.body, still);
    for (const p of s.vehicle.parts) place(p.body, p.spawnOffset);
    s.vehicle.resetActuators();
    s.chassisPose.snap();
    s.partPoses.forEach((t) => t.snap());
  };

  const keys = new Set<string>();
  let playerName = sanitizeName(loadName());
  let scores = loadScores();
  let scoreSaved = false;
  let progress = loadProgress();
  useTeam(teamFor(findVehicle(loadVehicle()).id, loadHelper()));
  useLevel(level);

  const menu = createMenu({
    initialName: loadName(),
    initialVehicle: main().vehicle.info.id,
    initialHelper: loadHelper(),
    initialLevel: level.id,
    getScores: () => scores,
    getProgress: () => progress,
    onPlay: (raw, vehicleId, helper, levelId) => {
      playerName = sanitizeName(raw);
      saveName(playerName);
      saveVehicle(vehicleId);
      saveHelper(helper);
      saveLevel(levelId);
      useTeam(teamFor(vehicleId, helper));
      useLevel(findLevel(levelId));
      menu.hide();
      resetAll();
    },
  });
  menu.show();

  window.addEventListener('keydown', (e) => {
    if (menu.visible) return;
    keys.add(e.code);
    if (e.code === 'KeyR') resetAll();
    if (e.code === 'KeyN' && round.result) {
      const i = LEVELS.findIndex((l) => l.id === level.id);
      const next = LEVELS[i + 1];
      if (next && isUnlocked(i + 1, progress)) {
        saveLevel(next.id);
        useLevel(next);
        resetAll();
      }
    }
    if (e.code === 'Tab') {
      e.preventDefault();
      active = (active + 1) % slots.length;
    }
    if (e.code === 'Escape' || e.code === 'KeyM') {
      keys.clear();
      resultBox.hidden = true;
      menu.show();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const resetAll = () => {
    slots.forEach(placeSlot);
    active = 0;
    sand.clear();
    round.reset();
    hopper.update(0, false);
    loadedThisRound = 0;
    scoreSaved = false;
    resultBox.hidden = true;
  };
  resetAll();

  const loop = createFixedStep(STEP);
  let last = performance.now();
  const euler = new THREE.Euler();
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let camYaw = 0;
  // Drag to look around the vehicle, wheel to zoom, C or double-click to reset.
  const orbit = createOrbit();
  const canvas = renderer.domElement;
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => dragging && orbit.drag(e.movementX, e.movementY));
  canvas.addEventListener('pointerup', () => (dragging = false));
  canvas.addEventListener('pointercancel', () => (dragging = false));
  canvas.addEventListener('dblclick', () => orbit.reset());
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); orbit.wheel(e.deltaY); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.style.touchAction = 'none';
  window.addEventListener('keydown', (e) => e.code === 'KeyC' && orbit.reset());
  const jitter = () => (Math.random() - 0.5) * 0.5;

  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;

    const cmd = commandsFromKeys(keys);
    const finishPressed = keys.has('Enter');
    const steps = menu.visible ? 0 : loop.advance(dt);
    const truck = main().vehicle;
    for (let i = 0; i < steps; i++) {
      for (const s of slots) {
        s.chassisPose.beforeStep();
        s.partPoses.forEach((t) => t.beforeStep());
        // Only the vehicle you control gets input; the other one waits on its handbrake.
        const c = s === current() ? cmd : IDLE;
        s.steer = smoothSteer(s.steer, c.steer, STEP, 2.5);
        s.vehicle.chassis.drive(c, s.steer);
        s.vehicle.actuate(c, STEP);
      }

      const carrier = truck.carrierCenter();
      const underSpout = isUnder(carrier, spout, HOPPER.zoneRadius);
      const canLoad =
        (round.state === 'ready' || round.state === 'loading' || round.state === 'hauling') &&
        loadedThisRound < truck.info.capacity;
      const n = hopper.update(STEP, canLoad && underSpout && Math.abs(truck.chassis.speedKmh()) < 3);
      for (let k = 0; k < n; k++) if (sand.spawn({ x: spout.x + jitter(), y: spout.y, z: spout.z + jitter() })) loadedThisRound++;

      for (const s of slots) s.vehicle.chassis.update(STEP);
      world.step();
      sand.recycle();

      round.update(STEP, {
        loaded: loadedThisRound,
        delivered: round.state === 'settling' ? countDelivered() : 0,
        bedUnderHopper: underSpout,
        bedInZone: Math.hypot(carrier.x - level.pit.x, carrier.z - level.pit.z) <= PIT.half + 4,
        bedAngle: truck.dumpAngle(),
        finishPressed,
      });

      for (const s of slots) {
        s.chassisPose.afterStep();
        s.partPoses.forEach((t) => t.afterStep());
      }
    }

    if (isOutOfBounds(truck.chassis.body.translation())) resetAll();
    for (const s of slots.slice(1)) if (isOutOfBounds(s.vehicle.chassis.body.translation())) placeSlot(s);

    const alpha = loop.alpha();
    for (const s of slots) {
      s.chassisPose.apply(s.mesh.root, alpha);
      s.partPoses.forEach((t, i) => t.apply(s.mesh.parts[i]!, alpha));
      s.vehicle.parts.forEach((p, i) => {
        const box = p.toggleBox && s.mesh.parts[i]!.children[p.toggleBox.index];
        if (box) box.visible = p.toggleBox!.visible();
      });
      const r = s.mesh.root;
      const ctrl = s.vehicle.chassis.controller;
      s.mesh.wheels.forEach((w, i) => {
        const c = ctrl.wheelChassisConnectionPointCs(i);
        const susp = ctrl.wheelSuspensionLength(i) ?? 0;
        if (!c) return;
        w.position.set(c.x, c.y - susp, c.z).applyQuaternion(r.quaternion).add(r.position);
        w.quaternion.copy(r.quaternion);
        w.rotateY(ctrl.wheelSteering(i) ?? 0);
        w.rotateX(ctrl.wheelRotation(i) ?? 0);
      });
    }
    sandMesh.sync(sand.grains);

    const vehicle = current().vehicle;
    const chassis = vehicle.chassis;
    const root = current().mesh.root;

    // Follow only the vehicle's heading, smoothed, and a smoothed look-at point:
    // suspension pitch/roll and bounces no longer shake the view.
    const size = vehicle.config.halfExtents.z;
    euler.setFromQuaternion(root.quaternion, 'YXZ');
    camYaw = smoothAngle(camYaw, euler.y, followFactor(dt, 3));
    lookTarget.lerp(camTarget.set(root.position.x, root.position.y + 1.2, root.position.z), followFactor(dt, 10));
    // Loaders get a higher camera so the bucket is visible over the cab.
    const camHeight = 2.5 + size * 0.6 + (vehicle.info.kind === 'loader' ? 2.5 : 0);
    const dist = (6 + size * 2) * orbit.zoom;
    const height = (camHeight + orbit.lift * dist) * orbit.zoom ** 0.5;
    const desired = chaseOffset(lookTarget, camYaw + orbit.yaw, dist * (1 - Math.max(0, orbit.lift) * 0.5), Math.max(1.2 - lookTarget.y, height)); // never below 1.2 m above ground
    // Stay inside the berms so zooming out near the edge never puts the camera inside the earth wall.
    const edge = MAP_HALF_SIZE - 2;
    const clampEdge = (v: number) => Math.max(-edge, Math.min(edge, v));
    camera.position.lerp(camTarget.set(clampEdge(desired.x), desired.y, clampEdge(desired.z)), followFactor(dt, 6));
    camera.lookAt(lookTarget);

    const speed = Math.abs(chassis.speedKmh()).toFixed(0);
    hud.textContent =
      `${vehicle.info.name} · ${speed} km/j · ${vehicle.actuatorText()}` +
      `  |  WASD jalan · Spasi rem · ${vehicle.hints.keys}${slots.length > 1 ? ' · Tab ganti kendaraan' : ''} · R ulang · M menu`;
    const teamHint =
      slots.length > 1 && round.state === 'settling'
        ? 'Tab ke loader untuk korek sisa pasir ke lubang, tekan Enter kalau sudah selesai'
        : stateText(round.state, truck);
    status.textContent =
      `⏱ ${round.seconds.toFixed(1)} s · muatan ${loadedThisRound}/${truck.info.capacity} · ${teamHint}`;
    if (round.result && !scoreSaved) {
      scoreSaved = true;
      const r = round.result;
      if (r.total > 0) {
        scores = addScore(scores, {
          name: playerName,
          score: r.total,
          percent: r.percent,
          seconds: Math.round(round.seconds * 10) / 10,
          date: new Date().toISOString().slice(0, 10),
          vehicle: truck.info.id,
          level: level.id,
        });
        saveScores(scores);
      }
      const earned = starsFor(level, r.percent, round.seconds);
      progress = recordStars(progress, level.id, earned);
      saveProgress(progress);
      const li = LEVELS.findIndex((l) => l.id === level.id);
      const nextOpen = !!LEVELS[li + 1] && isUnlocked(li + 1, progress);
      const place = r.total > 0 ? scores.findIndex((x) => x.score === r.total && x.name === playerName) + 1 : 0;
      resultBox.innerHTML =
        `<div class="rank">${r.rank}</div>` +
        `<div class="stars">${'★'.repeat(earned)}${'☆'.repeat(3 - earned)} · ${level.name}</div>` +
        `<div>${r.percent}% pasir sampai · ${round.seconds.toFixed(1)} s · ${truck.info.name}${slots.length > 1 ? ' + loader' : ''}</div>` +
        `<div>Skor ${r.total} <small>(${r.percent * 10} + bonus waktu ${r.timeBonus})</small></div>` +
        (place > 0 ? `<div class="place">Peringkat #${place} di high score, ${playerName}!</div>` : '') +
        `<div class="hint">R main lagi${nextOpen ? ' · N level berikutnya' : ''} · M menu</div>`;
      resultBox.hidden = false;
    }

    followSun(root.position);
    renderer.render(scene, camera);
  });
}

start();
