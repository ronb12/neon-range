import "./style.css";
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { RangeAudio } from "./game/audio.ts";
import { Fx } from "./game/fx.ts";
import { Hud } from "./game/hud.ts";
import { LaserGun, loadLaserGunModel } from "./game/laserGun.ts";
import { buildRange, loadBest, saveBest } from "./game/range.ts";
import { WorldMenu } from "./game/worldMenu.ts";
import { headsetAvailable, startHeadsetSession, watchHeadset } from "./game/xr.ts";

const ROUND_SECONDS = 45;
const TARGET_COUNT = 8;

type Kind = "standard" | "gold" | "rush" | "decoy";
type Target = {
  root: THREE.Group;
  velocity: THREE.Vector3;
  alive: boolean;
  kind: Kind;
  life: number;
  destY: number;
};

const hud = new Hud();
const audio = new RangeAudio();
const worldMenu = new WorldMenu();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setFoveation(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080f);
scene.fog = new THREE.Fog(0x05080f, 8, 28);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 80);
camera.position.set(0, 1.6, 0.45);
scene.add(camera);
scene.add(worldMenu.mesh);

const lights = buildRange(scene);
const fx = new Fx(scene);
const boardCanvas = document.createElement("canvas");
boardCanvas.width = 1024;
boardCanvas.height = 256;
const boardCtx = boardCanvas.getContext("2d")!;
const boardTex = new THREE.CanvasTexture(boardCanvas);
const board = new THREE.Mesh(
  new THREE.PlaneGeometry(4.6, 1.15),
  new THREE.MeshBasicMaterial({ map: boardTex, transparent: true }),
);
board.position.set(0, 3.2, -9.85);
scene.add(board);

let best = loadBest();
let hitStop = 0;

function paintBoard(score: number, combo: number, time: number, title = "NEON RANGE") {
  const urgent = time > 0 && time <= 10;
  boardCtx.fillStyle = urgent ? "#180810" : "#071018";
  boardCtx.fillRect(0, 0, 1024, 256);
  boardCtx.strokeStyle = urgent ? "#ff4d8d" : "#39e7ff";
  boardCtx.lineWidth = 6;
  boardCtx.strokeRect(18, 18, 988, 220);
  boardCtx.fillStyle = "#8aa3b8";
  boardCtx.font = "28px sans-serif";
  boardCtx.fillText(title, 48, 70);
  boardCtx.fillStyle = "#e8f4ff";
  boardCtx.font = "bold 72px sans-serif";
  boardCtx.fillText(String(score).padStart(4, "0"), 48, 170);
  boardCtx.font = "bold 48px sans-serif";
  boardCtx.fillText(`x${combo}`, 400, 166);
  boardCtx.fillStyle = urgent ? "#ff4d8d" : "#e8f4ff";
  boardCtx.fillText(`${Math.max(0, Math.ceil(time))}s`, 600, 166);
  boardCtx.fillStyle = "#8aa3b8";
  boardCtx.font = "28px sans-serif";
  boardCtx.fillText(`BEST ${best}`, 820, 70);
  boardTex.needsUpdate = true;
}

function aimPoint() {
  const pos = new THREE.Vector3();
  camera.getWorldPosition(pos);
  return pos;
}

function makePlate(kind: Kind) {
  const group = new THREE.Group();
  const radius = kind === "rush" ? 0.28 : kind === "gold" ? 0.32 : 0.38;
  const hue =
    kind === "gold"
      ? 0xffd166
      : kind === "rush"
        ? 0xff4d8d
        : kind === "decoy"
          ? 0x3a4450
          : Math.random() > 0.45
            ? 0x39e7ff
            : 0x7af0c8;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshStandardMaterial({
      color: hue,
      emissive: hue,
      emissiveIntensity: kind === "decoy" ? 0.08 : 0.58,
      roughness: 0.32,
      metalness: 0.22,
      side: THREE.DoubleSide,
    }),
  );
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.34, 24),
    new THREE.MeshBasicMaterial({
      color: kind === "decoy" ? 0x111111 : 0xffffff,
      side: THREE.DoubleSide,
    }),
  );
  core.position.z = 0.012;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius + 0.02, radius + 0.07, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  );
  group.add(disc, core, ring);
  if (kind === "decoy") {
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 1.5, 0.055),
      new THREE.MeshBasicMaterial({ color: 0xff3355, side: THREE.DoubleSide }),
    );
    bar.rotation.z = Math.PI / 4;
    bar.position.z = 0.02;
    const bar2 = bar.clone();
    bar2.rotation.z = -Math.PI / 4;
    group.add(bar, bar2);
  }
  group.userData.ring = ring;
  return group;
}

const targets: Target[] = [];

function randomLane(kind: Kind) {
  return {
    x: (Math.random() - 0.5) * (kind === "rush" ? 6.8 : 6.2),
    y: 1.05 + Math.random() * 1.65,
    z: kind === "gold" ? -6.6 - Math.random() * 2.8 : -4.2 - Math.random() * 4.2,
  };
}

function pickKind(): Kind {
  const roll = Math.random();
  if (timeLeft < 28 && roll < 0.12) return "decoy";
  if (timeLeft < 22 && roll < 0.28) return "gold";
  if (timeLeft < 16 && roll < 0.45) return "rush";
  if (roll < 0.07) return "gold";
  return "standard";
}

function makeTarget(): Target {
  const root = new THREE.Group();
  scene.add(root);
  const target: Target = {
    root,
    velocity: new THREE.Vector3(),
    alive: false,
    kind: "standard",
    life: 99,
    destY: 0,
  };
  hideTarget(target);
  return target;
}

function hideTarget(target: Target) {
  target.alive = false;
  target.root.visible = false;
  target.root.position.set(0, -3, -8);
  target.root.clear();
}

function spawnTarget(target: Target) {
  target.kind = live ? pickKind() : "standard";
  const lane = randomLane(target.kind);
  hideTarget(target);
  const plate = makePlate(target.kind);
  target.root.add(plate);
  target.root.userData.ring = plate.userData.ring;
  target.alive = true;
  target.root.visible = true;
  target.destY = lane.y;
  target.root.position.set(lane.x, lane.y - 0.7, lane.z);
  if (target.kind === "rush") {
    target.velocity.set((Math.random() > 0.5 ? 1 : -1) * 2.6, (Math.random() - 0.5) * 0.4, 1.1);
    target.life = 3.2;
  } else if (target.kind === "gold") {
    target.velocity.set((Math.random() - 0.5) * 2.1, (Math.random() - 0.5) * 0.7, 0);
    target.life = 99;
  } else {
    target.velocity.set((Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 0.45, 0);
    target.life = 99;
  }
}

function ownerOf(obj: THREE.Object3D) {
  let node: THREE.Object3D | null = obj;
  while (node) {
    const hit = targets.find((t) => t.root === node);
    if (hit) return hit;
    node = node.parent;
  }
  return undefined;
}

function liveRoots() {
  return targets.filter((t) => t.alive).map((t) => t.root);
}

const controllerFactory = new XRControllerModelFactory();
const controllers: THREE.XRTargetRaySpace[] = [];
const lasers: THREE.Line[] = [];
const guns = new Map<THREE.Object3D, LaserGun>();
let desktopGun: LaserGun | null = null;

function haptic(controller: THREE.Object3D | undefined, strength = 0.65, ms = 35) {
  if (!controller) return;
  const source = controller.userData.inputSource as XRInputSource | undefined;
  const actuator = source?.gamepad?.hapticActuators?.[0];
  void actuator?.pulse(strength, ms);
}

function setupController(index: number, gunModel: THREE.Group) {
  const controller = renderer.xr.getController(index);
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x39e7ff }));
  line.scale.z = 9;
  controller.add(line);
  const gun = new LaserGun(gunModel);
  gun.attach(controller);
  guns.set(controller, gun);
  controller.addEventListener("connected", (event: { data?: XRInputSource }) => {
    controller.userData.inputSource = event.data;
  });
  controller.addEventListener("disconnected", () => {
    controller.userData.inputSource = undefined;
  });
  controller.addEventListener("selectstart", () => fireFrom(controller));
  controller.addEventListener("squeezestart", () => fireFrom(controller));
  scene.add(controller);
  const grip = renderer.xr.getControllerGrip(index);
  grip.add(controllerFactory.createControllerModel(grip));
  scene.add(grip);
  controllers.push(controller);
  lasers.push(line);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tmpMatrix = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();
const tmpOrigin = new THREE.Vector3();
const center = new THREE.Vector3();
const box = new THREE.Box3();

let playing = false;
let live = false;
let countLeft = 0;
let countTick = 0;
let score = 0;
let combo = 1;
let bestCombo = 1;
let hits = 0;
let shots = 0;
let timeLeft = ROUND_SECONDS;
let comboTimer = 0;
let pointerHeld = false;
let fireCooldown = 0;

function accuracy() {
  return shots === 0 ? 100 : Math.round((hits / shots) * 100);
}

function syncHud(title?: string) {
  hud.setStats(score, combo, live ? timeLeft : ROUND_SECONDS, best, accuracy());
  paintBoard(score, combo, live ? timeLeft : ROUND_SECONDS, title);
}

function beginRound() {
  score = 0;
  combo = 1;
  bestCombo = 1;
  hits = 0;
  shots = 0;
  timeLeft = ROUND_SECONDS;
  comboTimer = 0;
  playing = true;
  live = false;
  countLeft = 3;
  countTick = 1;
  worldMenu.setVisible(true);
  worldMenu.showCountdown(3);
  targets.forEach(hideTarget);
  hud.setPlaying(true);
  audio.count(3);
  hud.flash("3");
  syncHud("GET READY");
}

function goLive() {
  live = true;
  worldMenu.setVisible(false);
  targets.forEach(spawnTarget);
  audio.count(0);
  hud.flash("Range is live");
  syncHud();
}

function finishRound() {
  playing = false;
  live = false;
  pointerHeld = false;
  targets.forEach(hideTarget);
  const record = score > loadBest();
  best = saveBest(score);
  if (record) audio.record();
  else audio.end();
  worldMenu.showAgain(score, best, record);
  worldMenu.setVisible(true);
  hud.setPlaying(false);
  hud.showEnd(score, hits, shots, bestCombo, best, record);
  paintBoard(score, combo, 0, record ? "HOUSE RECORD" : "RANGE CLOSED");
}

function registerHit(target: Target, point: THREE.Vector3, controller?: THREE.Object3D) {
  if (target.kind === "decoy") {
    score = Math.max(0, score - 80);
    combo = 1;
    comboTimer = 0;
    shots += 0;
    fx.burst(point, 0xff3355, 22);
    fx.floatScore(point, "NO-SHOOT", 0xff3355);
    audio.decoy();
    haptic(controller, 1, 80);
    hud.flash("No-shoot plate");
    spawnTarget(target);
    syncHud();
    return;
  }

  box.setFromObject(target.root);
  box.getCenter(center);
  const bullseye = point.distanceTo(center) < 0.22;
  const far = target.root.position.distanceTo(aimPoint()) > 7;
  let gained = 100 * combo;
  if (target.kind === "gold") gained = 250 * combo;
  if (target.kind === "rush") gained = 180 * combo;
  if (bullseye) gained += 70;
  if (far) gained += 40;
  score += gained;
  hits += 1;
  combo += 1;
  bestCombo = Math.max(bestCombo, combo);
  comboTimer = 1.2;
  hitStop = bullseye ? 0.055 : 0.03;
  const color = target.kind === "gold" ? 0xffd166 : bullseye ? 0xffffff : 0x7af6ff;
  fx.burst(point, color, target.kind === "gold" ? 28 : 18);
  fx.floatScore(target.root.position.clone().setY(1.1), bullseye ? `+${gained} ★` : `+${gained}`, color);
  if (target.kind === "gold") audio.gold();
  else audio.hit(combo, bullseye);
  haptic(controller, bullseye ? 1 : 0.75, bullseye ? 70 : 40);
  if (combo === 5) hud.flash("Combo x5");
  if (combo === 8) hud.flash("Streak");
  if (combo === 12) hud.flash("Unstoppable");
  spawnTarget(target);
  syncHud();
}

function fireRay(origin: THREE.Vector3, direction: THREE.Vector3, controller?: THREE.Object3D) {
  raycaster.set(origin, direction.normalize());
  const end = origin.clone().addScaledVector(raycaster.ray.direction, 14);

  if (!playing || !live) {
    const menuHit = raycaster.intersectObject(worldMenu.mesh, false);
    if (menuHit.length > 0 && worldMenu.mesh.visible && !playing) {
      audio.fire();
      haptic(controller, 0.5, 40);
      beginRound();
    }
    return;
  }

  shots += 1;
  audio.fire();
  haptic(controller, 0.28, 18);
  const gun = controller ? guns.get(controller) : desktopGun;
  gun?.kick();

  const hitsNow = raycaster.intersectObjects(liveRoots(), true);
  if (hitsNow.length === 0) {
    fx.bolt(origin, end, 0x5ec8ff);
    fx.splat(new THREE.Vector3(end.x * 0.2, THREE.MathUtils.clamp(origin.y, 0.6, 2.6), -10.05));
    audio.miss();
    combo = 1;
    comboTimer = 0;
    syncHud();
    return;
  }
  const hit = hitsNow[0];
  fx.bolt(origin, hit.point, 0xb8ffff);
  const target = ownerOf(hit.object);
  if (target) registerHit(target, hit.point, controller);
}

function fireFrom(controller: THREE.Object3D) {
  if (renderer.xr.isPresenting) fireCooldown = 0.13;
  const gun = guns.get(controller);
  if (gun) {
    gun.muzzleWorld(tmpOrigin);
    tmpMatrix.identity().extractRotation(controller.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMatrix);
    fireRay(tmpOrigin.clone(), tmpDir.clone(), controller);
    return;
  }
  tmpMatrix.identity().extractRotation(controller.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMatrix);
  tmpOrigin.setFromMatrixPosition(controller.matrixWorld);
  fireRay(tmpOrigin.clone(), tmpDir.clone(), controller);
}

function fireFromPointer(clientX: number, clientY: number) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (desktopGun) {
    fireRay(desktopGun.muzzleWorld(tmpOrigin).clone(), raycaster.ray.direction.clone());
    return;
  }
  fireRay(raycaster.ray.origin.clone(), raycaster.ray.direction.clone());
}

function updateLasers() {
  for (let i = 0; i < controllers.length; i++) {
    const controller = controllers[i];
    const laser = lasers[i];
    tmpMatrix.identity().extractRotation(controller.matrixWorld);
    tmpDir.set(0, 0, -1).applyMatrix4(tmpMatrix);
    tmpOrigin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.set(tmpOrigin, tmpDir);
    const hot =
      (live && raycaster.intersectObjects(liveRoots(), true).length > 0) ||
      (!live && worldMenu.mesh.visible && raycaster.intersectObject(worldMenu.mesh, false).length > 0);
    (laser.material as THREE.LineBasicMaterial).color.setHex(hot ? 0xffd166 : 0x39e7ff);
  }
}

document.querySelector("#start")!.addEventListener("click", () => {
  audio.fire();
  beginRound();
});
document.querySelector("#again")!.addEventListener("click", () => beginRound());
document.querySelector("#headset")!.addEventListener("click", () => {
  void enterHeadset();
});

async function enterHeadset() {
  hud.setHeadsetState("checking", "Starting the headset session…");
  try {
    await startHeadsetSession(renderer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not enter VR.";
    hud.setHeadsetState("unsupported", message);
  }
}

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (renderer.xr.isPresenting) return;
  pointerHeld = live;
  fireCooldown = 0;
  fireFromPointer(event.clientX, event.clientY);
});
window.addEventListener("pointerup", () => {
  pointerHeld = false;
});
window.addEventListener("pointermove", (event) => {
  if (!pointerHeld || !live || renderer.xr.isPresenting) return;
  if (fireCooldown > 0) return;
  fireFromPointer(event.clientX, event.clientY);
  fireCooldown = 0.12;
});
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.xr.addEventListener("sessionstart", () => {
  document.body.classList.add("in-xr");
  renderer.setPixelRatio(1);
  hud.setHeadsetState("presenting");
  if (desktopGun) desktopGun.root.visible = false;
  if (!playing) beginRound();
});
renderer.xr.addEventListener("sessionend", () => {
  document.body.classList.remove("in-xr");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (desktopGun) desktopGun.root.visible = true;
  worldMenu.setVisible(!playing);
  void headsetAvailable().then((state) => hud.setHeadsetState(state));
});

const clock = new THREE.Clock();

function tick() {
  let dt = Math.min(clock.getDelta(), 0.05);
  if (hitStop > 0) {
    hitStop -= dt;
    dt *= 0.15;
  }

  const pulse = 0.65 + Math.sin(clock.elapsedTime * (live && timeLeft <= 10 ? 8 : 2)) * 0.35;
  lights.hot.intensity = 8 + pulse * 4;
  lights.accent.intensity = 8 + (1 - pulse) * 3;
  desktopGun?.update(dt);
  for (const gun of guns.values()) gun.update(dt);

  if (renderer.xr.isPresenting) {
    fireCooldown -= dt;
    for (const controller of controllers) {
      const pad = (controller.userData.inputSource as XRInputSource | undefined)?.gamepad;
      if (pad?.buttons[0]?.pressed && fireCooldown <= 0) {
        fireFrom(controller);
        fireCooldown = 0.13;
      }
    }
    updateLasers();
  }

  if (playing && !live) {
    countTick -= dt;
    if (countTick <= 0) {
      countLeft -= 1;
      countTick = 1;
      if (countLeft <= 0) goLive();
      else {
        worldMenu.showCountdown(countLeft);
        audio.count(countLeft);
        hud.flash(String(countLeft));
        paintBoard(0, 1, ROUND_SECONDS, String(countLeft));
      }
    }
  }

  if (live) {
    timeLeft -= dt;
    comboTimer -= dt;
    if (!renderer.xr.isPresenting) fireCooldown -= dt;
    if (comboTimer <= 0) combo = 1;
    if (timeLeft <= 0) finishRound();
    syncHud(timeLeft <= 10 ? "FINAL 10" : "NEON RANGE");

    const eye = aimPoint();
    const haste = 1 + (ROUND_SECONDS - timeLeft) * 0.016;
    for (const target of targets) {
      if (!target.alive) continue;
      target.life -= dt;
      if (target.root.position.y < target.destY) {
        target.root.position.y = Math.min(target.destY, target.root.position.y + dt * 3.4);
      }
      target.root.position.addScaledVector(target.velocity, dt * haste);
      if (Math.abs(target.root.position.x) > 3.6) target.velocity.x *= -1;
      if (target.root.position.y < 0.9 || target.root.position.y > 2.9) target.velocity.y *= -1;
      if (target.root.position.z > -3.2) target.velocity.z = -Math.abs(target.velocity.z);
      target.root.lookAt(eye.x, target.root.position.y, eye.z);
      const ring = target.root.userData.ring as THREE.Object3D | undefined;
      if (ring) ring.rotation.z += dt * (target.kind === "gold" ? 3.2 : 1.6);
      if (target.life <= 0) spawnTarget(target);
    }
  } else if (worldMenu.mesh.visible) {
    worldMenu.mesh.lookAt(aimPoint());
  }

  fx.update(dt);
  renderer.render(scene, camera);
}

async function boot() {
  hud.setHeadsetState("checking", "Loading the laser…");
  const [gunModel] = await Promise.all([loadLaserGunModel(), audio.load()]);
  setupController(0, gunModel);
  setupController(1, gunModel);
  desktopGun = new LaserGun(gunModel);
  desktopGun.setDesktopPose();
  desktopGun.attach(camera);
  for (let i = 0; i < TARGET_COUNT; i++) targets.push(makeTarget());
  watchHeadset((state) => hud.setHeadsetState(state));
  worldMenu.showIdle(best);
  hud.setStats(0, 1, ROUND_SECONDS, best, 100);
  paintBoard(0, 1, ROUND_SECONDS);
  renderer.setAnimationLoop(tick);
}

void boot().catch((error) => {
  console.error(error);
  hud.setHeadsetState("unsupported", "Could not load the range assets.");
});
