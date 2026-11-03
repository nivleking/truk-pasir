import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { createOrbit } from './core/orbit';
import { chaseOffset, followFactor, smoothAngle } from './core/chaseCam';
import { isOutOfBounds } from './core/drive';
import { createFixedStep } from './core/fixedStep';
import { addScore, sanitizeName } from './core/highScores';
import { createHopper, isUnder } from './core/hopper';
import { earnings, freePlay, owns, tuning } from './core/career';
import { findLevel, inPit, levelBumps, isUnlocked, LEVELS, PIT, recordStars, starsFor, type Level } from './core/levels';
import { commandsFromKeys, smoothSteer, type DriveCommands } from './core/input';
import { createRound, type RoundState } from './core/round';
import { findVehicle, teamFor, type VehicleId } from './core/vehicles';
import { createAudio } from './audio';
import { createMenu } from './menu';
import { createMinimap } from './render/minimap';
import { HOPPER, spoutPosition } from './physics/hopperStructure';
import { digSite, pileGrains } from './core/excavator';
import { createLevelPhysics } from './physics/level';
import { createSandPool, SAND } from './physics/sand';
import type { Vehicle } from './physics/vehicle';
import { createVehicle } from './physics/vehicles';
import { createWorld, MAP_HALF_SIZE } from './physics/world';
import { createSandMesh } from './render/sandMesh';
import { createDustMesh } from './render/dustMesh';
import { createTireTrackMesh } from './render/tireTrackMesh';
import { createParticles } from './core/particles';
import { createTireTracks } from './core/tireTracks';
import { createScene } from './render/scene';
import { createVehicleMesh, type VehicleMesh } from './render/vehicleMesh';
import { createLevelMesh } from './render/levelMesh';
import {
  loadCareer,
  loadHelper,
  loadLevel,
  loadMode,
  loadName,
  loadProgress,
  loadScores,
  loadTime,
  loadVehicle,
  saveCareer,
  saveHelper,
  saveLevel,
  saveMode,
  saveName,
  saveProgress,
  saveScores,
  saveTime,
  saveVehicle,
} from './storage';

const STEP = 1 / 60;
const IDLE: DriveCommands = { throttle: 0, steer: 0, handbrake: true, bed: 0, tilt: 0, swing: 0, stick: 0 };
const DUMP_ANGLE = 25;

function stateText(state: RoundState, v: Vehicle, dig: boolean): string {
  switch (state) {
    case 'ready':
      if (dig) return 'Dig: open the bucket (X), lower the boom (Q), pull the stick in (I) and curl (Z), lift (E), swing left (J) over the bed, open (X)';
      return v.info.kind === 'loader'
        ? 'Load up: raise the arm (E) and stop with the bucket under the hopper'
        : 'Load up: stop with the bed under the hopper';
    case 'loading':
      return 'Loading sand...';
    case 'hauling':
      return v.hints.hauling;
    case 'dumping':
      return v.hints.dumping;
    case 'settling':
      return 'Counting sand...';
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

  const { renderer, scene, camera, followSun, setTimeOfDay, aimHeadlights } = createScene(container);
  const { rapier, world } = await createWorld();
  world.timestep = STEP;

  const minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
  const minimap = createMinimap(minimapCanvas);
  const sand = createSandPool(rapier, world);
  const sandMesh = createSandMesh();
  scene.add(sandMesh.mesh);

  // ---- Effects: dust from wheels and landing sand, tire marks, time of day ----
  const dust = createParticles(700);
  const dustMesh = createDustMesh(700);
  const tireTracks = createTireTracks(1600, 0.35);
  const trackMesh = createTireTrackMesh(1600);
  scene.add(dustMesh.points, trackMesh.mesh);
  const grainVy = new Float32Array(SAND.poolSize);
  let timeOfDay = loadTime();
  const applyTime = () => {
    setTimeOfDay(timeOfDay);
    dustMesh.setColor(timeOfDay === 'evening' ? 0xa8806a : 0xc8a874);
  };
  applyTime();
  const setDustScale = () => dustMesh.setViewHeight(container.clientHeight);
  setDustScale();
  window.addEventListener('resize', setDustScale);

  // ---- Level: ground with dump pit, obstacles, hopper, bumps. Rebuilt when another level is picked. ----
  let level = findLevel(loadLevel());
  let levelPhysics: { dispose(): void } | null = null;
  let levelMesh: { dispose(): void } | null = null;
  let spout = spoutPosition(level.hopper);
  let levelKey = '';
  function useLevel(next: Level) {
    const key = next.id + (dig() ? ':dig' : '');
    if (key === levelKey) return;
    levelKey = key;
    levelPhysics?.dispose();
    levelMesh?.dispose();
    level = next;
    const bumps = levelBumps(level);
    levelPhysics = createLevelPhysics(rapier, world, level, bumps, dig());
    const lm = createLevelMesh(level, bumps, dig());
    scene.add(lm.group);
    levelMesh = lm;
    minimap.setLevel(level);
    spout = spoutPosition(level.hopper);
    for (const s of slots) s.home = homeFor(slots.indexOf(s));
  }
  // The helper parks beside the truck; on a walled track there is only room just next to it.
  const homeFor = (i: number) => {
    if (dig()) {
      const site = digSite(level.hopper);
      return i === 0 ? site.truck : site.excavator;
    }
    return i === 0 ? level.spawn : { x: level.spawn.x + (level.track ? 3.6 : -8), z: level.spawn.z - (level.track ? 1 : 0) };
  };

  let round = createRound({ dumpAngle: DUMP_ANGLE, settleSeconds: 1.5 });
  let loadedThisRound = 0;

  /** Grains riding in the truck bed: close to the bed center and off the ground. */
  const grainsInBed = (v: Vehicle) => {
    const c = v.carrierCenter();
    let n = 0;
    for (const g of sand.grains) {
      if (!g.isEnabled()) continue;
      const t = g.translation();
      if (t.y > c.y - 0.6 && Math.hypot(t.x - c.x, t.z - c.z) < 2.4) n++;
    }
    return n;
  };

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
  /** Excavator job: no hopper, the truck is filled from a sand pile by the excavator. */
  const dig = () => slots.some((s) => s.vehicle.info.kind === 'excavator');
  let pileSize = 0;
  /** The pile only counts as this round's load once the player starts working, so the clock waits too. */
  let digStarted = false;

  function useTeam(ids: VehicleId[]) {
    const t = tuning(activeCareer());
    const key = ids.join('+') + JSON.stringify(t);
    if (key === teamKey) return;
    teamKey = key;
    for (const s of slots) {
      for (const p of s.vehicle.parts) world.removeRigidBody(p.body);
      world.removeVehicleController(s.vehicle.chassis.controller);
      world.removeRigidBody(s.vehicle.chassis.body);
      s.mesh.dispose();
    }
    slots = ids.map((id) => {
      const base = findVehicle(id);
      const vehicle = createVehicle(rapier, world, { ...base, capacity: Math.round(base.capacity * t.capacity) }, t);
      const mesh = createVehicleMesh(vehicle);
      scene.add(mesh.root, ...mesh.wheels, ...mesh.parts);
      return {
        vehicle,
        mesh,
        chassisPose: trackerFor(vehicle.chassis.body),
        partPoses: vehicle.parts.map((p) => trackerFor(p.body)),
        steer: 0,
        home: { x: 0, z: 0 },
      };
    });
    slots.forEach((s, i) => (s.home = homeFor(i)));
    active = 0;
    hopper = createHopper({ rate: 50, capacity: main().vehicle.info.capacity });
    // Only the loader helper can scrape spilled sand, so only then does the player end the round with Enter.
    round = createRound({ dumpAngle: DUMP_ANGLE, settleSeconds: 1.5, manualFinish: slots.length > 1 && !dig() });
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

  const audio = createAudio();
  const keys = new Set<string>();
  let playerName = sanitizeName(loadName());
  let scores = loadScores();
  let scoreSaved = false;
  let progress = loadProgress();
  let career = loadCareer();
  // Career: earn money, buy vehicles and upgrades, unlock sites one by one. Free play: everything open, stock tuning.
  let mode = loadMode();
  const FREE = freePlay();
  const activeCareer = () => (mode === 'career' ? career : FREE);
  const levelOpen = (i: number) => mode === 'free' || isUnlocked(i, progress);
  // Only vehicles you own can be driven; the helper loader has to be owned too.
  const teamOf = (id: string, helper: boolean) =>
    teamFor(owns(activeCareer(), findVehicle(id).id) ? id : 'dump-truck', helper && owns(activeCareer(), 'wheel-loader'));
  useTeam(teamOf(loadVehicle() ?? 'dump-truck', loadHelper()));
  useLevel(level);

  const menu = createMenu({
    initialName: loadName(),
    initialVehicle: main().vehicle.info.id,
    initialHelper: loadHelper(),
    initialLevel: level.id,
    getScores: () => scores,
    getProgress: () => progress,
    getCareer: activeCareer,
    setCareer: (c) => {
      if (mode !== 'career') return;
      career = c;
      saveCareer(c);
    },
    getMode: () => mode,
    getTime: () => timeOfDay,
    setTime: (t) => {
      timeOfDay = t;
      saveTime(t);
      applyTime();
    },
    setMode: (m) => {
      mode = m;
      saveMode(m);
    },
    levelOpen,
    onPlay: (raw, vehicleId, helper, levelId) => {
      playerName = sanitizeName(raw);
      saveName(playerName);
      saveVehicle(vehicleId);
      saveHelper(helper);
      saveLevel(levelId);
      useTeam(teamOf(vehicleId, helper));
      useLevel(findLevel(levelId));
      audio.resume();
      menu.hide();
      resetAll();
    },
  });
  menu.show();

  window.addEventListener('keydown', (e) => {
    if (menu.visible) return;
    keys.add(e.code);
    audio.resume();
    if (e.code === 'KeyR') resetAll();
    if (e.code === 'KeyV') audio.toggleMute();
    if (e.code === 'KeyF') fpsOn = !fpsOn;
    if (e.code === 'KeyN' && round.result) {
      const i = LEVELS.findIndex((l) => l.id === level.id);
      const next = LEVELS[i + 1];
      if (next && levelOpen(i + 1)) {
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
    active = dig() ? 1 : 0;
    sand.clear();
    round.reset();
    hopper.update(0, false);
    loadedThisRound = 0;
    pileSize = 0;
    digStarted = false;
    if (dig()) {
      const site = digSite(level.hopper);
      for (const p of pileGrains(site.pile, Math.min(site.pileCount, main().vehicle.info.capacity), SAND.radius, site.pileRadius))
        if (sand.spawn(p)) pileSize++;
    }
    scoreSaved = false;
    resultBox.hidden = true;
    dust.clear();
    tireTracks.clear();
    grainVy.fill(0);
  };
  resetAll();

  const loop = createFixedStep(STEP);
  let last = performance.now();
  const euler = new THREE.Euler();
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let camYaw = 0;
  let camHeightY = 0;
  let fpsOn = false;
  let fpsAcc = 0;
  let fpsFrames = 0;
  let fpsText = '';
  let worstFrame = 0;
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

  const contact = new THREE.Vector3();
  /** Dust behind moving wheels and where falling sand lands, plus tire marks on the ground. */
  function updateEffects(dt: number) {
    slots.forEach((s, si) => {
      const ctrl = s.vehicle.chassis.controller;
      const speed = Math.abs(s.vehicle.chassis.speedKmh());
      const crawler = s.vehicle.info.kind === 'excavator';
      const width = s.vehicle.config.wheelWidth * (crawler ? 1.2 : 0.9);
      const lin = s.vehicle.chassis.body.linvel();
      s.vehicle.config.wheels.forEach((_, i) => {
        const key = si * 16 + i;
        if (!ctrl.wheelIsInContact(i) || !ctrl.wheelContactPoint(i, contact)) {
          tireTracks.lift(key);
          return;
        }
        tireTracks.touch(key, contact, width);
        // More dust the faster you go; none when crawling along.
        if (speed > 6 && Math.random() < Math.min(1, (speed - 6) * 0.9 * dt)) {
          const r = () => (Math.random() - 0.5) * 0.8;
          dust.emit(
            { x: contact.x + r() * 0.5, y: contact.y + 0.25, z: contact.z + r() * 0.5 },
            { x: -lin.x * 0.25 + r(), y: 0.4 + Math.random() * 0.5, z: -lin.z * 0.25 + r() },
            1.2 + Math.random() * 0.8,
            0.6 + speed * 0.02,
          );
        }
      });
    });
    // A grain that was falling fast and has just stopped hit something: puff.
    sand.grains.forEach((g, i) => {
      if (!g.isEnabled()) {
        grainVy[i] = 0;
        return;
      }
      const vy = g.linvel().y;
      if (grainVy[i]! < -3 && vy > -1 && Math.random() < 0.35) {
        const t = g.translation();
        dust.emit(
          { x: t.x, y: t.y + 0.1, z: t.z },
          { x: (Math.random() - 0.5) * 1.2, y: 0.3 + Math.random() * 0.4, z: (Math.random() - 0.5) * 1.2 },
          0.9 + Math.random() * 0.6,
          0.5,
        );
      }
      grainVy[i] = vy;
    });
    dust.update(dt);
    dustMesh.sync(dust.items, dust.count);
    trackMesh.sync(tireTracks.segments, tireTracks.version);
  }
  const noseFrom = new THREE.Vector3();
  const noseTo = new THREE.Vector3();

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
        s.vehicle.assistSand?.(sand.grains, c);
      }

      const carrier = truck.carrierCenter();
      const underSpout = !dig() && isUnder(carrier, spout, HOPPER.zoneRadius);
      if (dig() && !digStarted && (cmd.throttle || cmd.steer || cmd.bed || cmd.tilt || cmd.swing || cmd.stick)) {
        digStarted = true;
        loadedThisRound = pileSize;
      }
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
    if (!menu.visible) updateEffects(dt);

    let movingGrains = 0;
    for (const g of sand.grains) if (g.isEnabled() && Math.abs(g.linvel().y) > 1.5) movingGrains++;
    audio.update({
      speedKmh: current().vehicle.chassis.speedKmh(),
      throttle: cmd.throttle,
      hydraulics: cmd.bed !== 0 || cmd.tilt !== 0 || cmd.swing !== 0 || cmd.stick !== 0,
      movingGrains,
      active: !menu.visible,
    });

    const vehicle = current().vehicle;
    const chassis = vehicle.chassis;
    const root = current().mesh.root;

    // Follow only the vehicle's heading, smoothed, and a smoothed look-at point:
    // suspension pitch/roll and bounces no longer shake the view.
    const size = vehicle.config.halfExtents.z;
    euler.setFromQuaternion(root.quaternion, 'YXZ');
    camYaw = smoothAngle(camYaw, euler.y, followFactor(dt, 3));
    // Height is followed much more slowly than x/z: suspension bounce and bumps were the remaining
    // source of the small camera sway, since both the look-at point and the camera rode on them.
    const fx = followFactor(dt, 10);
    camHeightY += (root.position.y - camHeightY) * followFactor(dt, 1.5);
    lookTarget.set(
      lookTarget.x + (root.position.x - lookTarget.x) * fx,
      camHeightY + 1.2,
      lookTarget.z + (root.position.z - lookTarget.z) * fx,
    );
    // Loaders get a higher camera so the bucket is visible over the cab.
    const camHeight = 2.5 + size * 0.6 + (vehicle.info.kind === 'loader' ? 2.5 : vehicle.info.kind === 'excavator' ? 3.5 : 0);
    const dist = (6 + size * 2) * orbit.zoom;
    const height = (camHeight + orbit.lift * dist) * orbit.zoom ** 0.5;
    const desired = chaseOffset(lookTarget, camYaw + orbit.yaw, dist * (1 - Math.max(0, orbit.lift) * 0.5), Math.max(1.2 - lookTarget.y, height)); // never below 1.2 m above ground
    // Stay inside the berms so zooming out near the edge never puts the camera inside the earth wall.
    const edge = MAP_HALF_SIZE - 2;
    const clampEdge = (v: number) => Math.max(-edge, Math.min(edge, v));
    camera.position.lerp(camTarget.set(clampEdge(desired.x), desired.y, clampEdge(desired.z)), followFactor(dt, 6));
    camera.lookAt(lookTarget);

    // F: frame-time overlay, to tell real stutter (uneven frames) apart from camera motion.
    fpsAcc += dt;
    fpsFrames++;
    worstFrame = Math.max(worstFrame, dt);
    if (fpsAcc >= 0.5) {
      fpsText = `${Math.round(fpsFrames / fpsAcc)} fps · worst ${(worstFrame * 1000).toFixed(0)} ms`;
      fpsAcc = 0;
      fpsFrames = 0;
      worstFrame = 0;
    }
    const speed = Math.abs(chassis.speedKmh()).toFixed(0);
    hud.textContent =
      `${vehicle.info.name} · ${speed} km/h · ${vehicle.actuatorText()}` +
      `  |  WASD drive · Space brake · ${vehicle.hints.keys}${slots.length > 1 ? ' · Tab switch vehicle' : ''} · V sound · R restart · M menu` +
      (fpsOn ? `  |  ${fpsText}` : '');
    const working = round.state === 'ready' || round.state === 'loading' || round.state === 'hauling';
    const teamHint =
      slots.length > 1 && !dig() && round.state === 'settling'
        ? 'Tab to the loader to scrape leftover sand into the pit, press Enter when done'
        : dig() && digStarted && working
          ? current() === main()
            ? truck.hints.hauling
            : 'Fill the truck bed, then Tab to the truck and haul it to the pit'
          : stateText(round.state, truck, dig());
    status.textContent = dig()
      ? `⏱ ${round.seconds.toFixed(1)} s · in the truck ${grainsInBed(truck)}/${pileSize} · ${teamHint}`
      : `⏱ ${round.seconds.toFixed(1)} s · load ${loadedThisRound}/${truck.info.capacity} · ${teamHint}`;
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
      audio.chime(earned);
      const pay = mode === 'career' ? earnings(countDelivered(), earned) : 0;
      if (pay > 0) {
        career = { ...career, money: career.money + pay };
        saveCareer(career);
      }
      const li = LEVELS.findIndex((l) => l.id === level.id);
      const nextOpen = !!LEVELS[li + 1] && levelOpen(li + 1);
      const place = r.total > 0 ? scores.findIndex((x) => x.score === r.total && x.name === playerName) + 1 : 0;
      resultBox.innerHTML =
        `<div class="rank">${r.rank}</div>` +
        `<div class="stars">${'★'.repeat(earned)}${'☆'.repeat(3 - earned)} · ${level.name}</div>` +
        `<div>${r.percent}% sand delivered · ${round.seconds.toFixed(1)} s · ${truck.info.name}${slots.length > 1 ? (dig() ? ' + excavator' : ' + loader') : ''}</div>` +
        `<div>Score ${r.total} <small>(${r.percent * 10} + time bonus ${r.timeBonus})</small></div>` +
        (mode === 'career' ? `<div class="pay">+$${pay.toLocaleString('en-US')} · wallet $${career.money.toLocaleString('en-US')}</div>` : '') +
        (place > 0 ? `<div class="place">#${place} on the leaderboard, ${playerName}!</div>` : '') +
        `<div class="hint">R play again${nextOpen ? ' · N next level' : ''} · M menu</div>`;
      resultBox.hidden = false;
    }

    minimap.draw(
      slots.map((s) => {
        euler.setFromQuaternion(s.mesh.root.quaternion, 'YXZ');
        return { x: s.mesh.root.position.x, z: s.mesh.root.position.z, yaw: euler.y, active: s === current() };
      }),
    );
    followSun(root.position);
    if (timeOfDay === 'evening') {
      const z = vehicle.config.halfExtents.z;
      aimHeadlights(root.localToWorld(noseFrom.set(0, 1.2, z + 0.3)), root.localToWorld(noseTo.set(0, -0.5, z + 14)));
    }
    renderer.render(scene, camera);
  });
}

start();
