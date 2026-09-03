import "./style.css";
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { RangeAudio } from "./game/audio.ts";
import { Fx } from "./game/fx.ts";
import { Hud } from "./game/hud.ts";
import { buildRange, loadBest, saveBest } from "./game/range.ts";
import { WorldMenu } from "./game/worldMenu.ts";
import { headsetAvailable, startHeadsetSession, watchHeadset } from "./game/xr.ts";

const ROUND_SECONDS = 45;
const TARGET_COUNT = 8;

type Kind = "standard" | "gold" | "rush";
type Target = {
  mesh: THREE.Mesh;
  core: THREE.Mesh;
  ring: THREE.Mesh;
  velocity: THREE.Vector3;
  alive: boolean;
  kind: Kind;
  life: number;
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
camera.position.set(0, 1.6, 0.35);
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
board.position.set(0, 3.35, -9.9);
scene.add(board);

let best = loadBest();

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

const targetGeo = new THREE.CircleGeometry(0.38, 32);
const coreGeo = new THREE.CircleGeometry(0.13, 24);
const ringGeo = new THREE.RingGeometry(0.4, 0.46, 32);
const targets: Target[] = [];

function aimPoint() {
  const pos = new THREE.Vector3();
  camera.getWorldPosition(pos);
  return pos;
}

function randomLane(kind: Kind) {
  const spread = kind === "rush" ? 7.2 : 6.2;
  return {
    x: (Math.random() - 0.5) * spread,
    y: 1.05 + Math.random() * 1.7,
    z: kind === "gold" ? -6.4 - Math.random() * 3.4 : -4.1 - Math.random() * 4.4,
  };
}

function pickKind(): Kind {
  const late = timeLeft < 22;
  const roll = Math.random();
  if (late && roll < 0.16) return "gold";
  if (timeLeft < 16 && roll < 0.3) return "rush";
  if (roll < 0.08) return "gold";
  return "standard";
}

function makeTarget(): Target {
  const mesh = new THREE.Mesh(
    targetGeo,
    new THREE.MeshStandardMaterial({
      color: 0x39e7ff,
      emissive: 0x39e7ff,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  const core = new THREE.Mesh(
    coreGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  );
  core.position.z = 0.01;
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  );
  mesh.add(core);
  mesh.add(ring);
  scene.add(mesh);
  const target: Target = {
    mesh,
    core,
    ring,
    velocity: new THREE.Vector3(),
    alive: false,
    kind: "standard",
    life: 99,
  };
  hideTarget(target);
  return target;
}

function hideTarget(target: Target) {
  target.alive = false;
  target.mesh.visible = false;
  target.mesh.position.set(0, -4, -8);
}

const coreMats = {
  standard: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  gold: new THREE.MeshBasicMaterial({ color: 0xfff4c2, side: THREE.DoubleSide }),
  rush: new THREE.MeshBasicMaterial({ color: 0xffd0e0, side: THREE.DoubleSide }),
};

function styleTarget(target: Target) {
  const mat = target.mesh.material as THREE.MeshStandardMaterial;
  target.mesh.scale.setScalar(0.18);
  if (target.kind === "gold") {
    mat.color.setHex(0xffd166);
    mat.emissive.setHex(0xffd166);
    target.core.material = coreMats.gold;
    target.velocity.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 0.9, 0);
    target.life = 99;
  } else if (target.kind === "rush") {
    mat.color.setHex(0xff4d8d);
    mat.emissive.setHex(0xff4d8d);
    target.core.material = coreMats.rush;
    target.velocity.set((Math.random() > 0.5 ? 1 : -1) * (2.6 + Math.random()), (Math.random() - 0.5) * 0.5, 1.1);
    target.life = 3.4;
  } else {
    const hue = Math.random() > 0.45 ? 0x39e7ff : 0x7af0c8;
    mat.color.setHex(hue);
    mat.emissive.setHex(hue);
    target.core.material = coreMats.standard;
    target.velocity.set((Math.random() - 0.5) * 1.15, (Math.random() - 0.5) * 0.5, 0);
    target.life = 99;
  }
}

function spawnTarget(target: Target) {
  target.kind = live ? pickKind() : "standard";
  const lane = randomLane(target.kind);
  const eye = aimPoint();
  target.alive = true;
  target.mesh.visible = true;
  target.mesh.position.set(lane.x, lane.y, lane.z);
  target.mesh.lookAt(eye.x, lane.y, eye.z);
  styleTarget(target);
}

for (let i = 0; i < TARGET_COUNT; i++) targets.push(makeTarget());

const targetMeshes = () => targets.filter((t) => t.alive).map((t) => t.mesh);

const controllerFactory = new XRControllerModelFactory();
const controllers: THREE.XRTargetRaySpace[] = [];
const lasers: THREE.Line[] = [];

function addBlaster(controller: THREE.Object3D) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.05, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x1a2430, metalness: 0.4, roughness: 0.35 }),
  );
  body.position.set(0, -0.03, -0.08);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0x39e7ff, emissive: 0x39e7ff, emissiveIntensity: 0.5 }),
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, -0.01, -0.16);
  controller.add(body);
  controller.add(barrel);
}

function haptic(controller: THREE.Object3D, strength = 0.65, ms = 35) {
  const source = controller.userData.inputSource as XRInputSource | undefined;
  const actuator = source?.gamepad?.hapticActuators?.[0];
  void actuator?.pulse(strength, ms);
}

function setupController(index: number) {
  const controller = renderer.xr.getController(index);
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x39e7ff }));
  line.scale.z = 8;
  controller.add(line);
  addBlaster(controller);
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

setupController(0);
setupController(1);

renderer.xr.addEventListener("sessionstart", () => {
  document.body.classList.add("in-xr");
  renderer.setPixelRatio(1);
  hud.setHeadsetState("presenting");
  if (!playing) beginRound();
});
renderer.xr.addEventListener("sessionend", () => {
  document.body.classList.remove("in-xr");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  worldMenu.setVisible(!playing);
  void headsetAvailable().then((state) => hud.setHeadsetState(state));
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tmpMatrix = new THREE.Matrix4();
const tmpDir = new THREE.Vector3();
const tmpOrigin = new THREE.Vector3();

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
  hud.flash("Live fire");
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
  const local = target.mesh.worldToLocal(point.clone());
  const bullseye = Math.hypot(local.x, local.y) < 0.14;
  const far = target.mesh.position.distanceTo(aimPoint()) > 7;
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
  const color = target.kind === "gold" ? 0xffd166 : bullseye ? 0xffffff : 0xfff3a1;
  fx.burst(target.mesh.position, color, target.kind === "gold" ? 26 : 16);
  fx.floatScore(target.mesh.position, bullseye ? `+${gained} ★` : `+${gained}`, color);
  if (target.kind === "gold") audio.gold();
  else audio.hit(combo, bullseye);
  if (controller) haptic(controller, bullseye ? 1 : 0.8, bullseye ? 70 : 45);
  if (combo === 5) hud.flash("Combo x5");
  if (combo === 8) hud.flash("On fire");
  if (combo === 12) hud.flash("Range god");
  spawnTarget(target);
  syncHud();
}

function fireRay(origin: THREE.Vector3, direction: THREE.Vector3, controller?: THREE.Object3D) {
  raycaster.set(origin, direction.normalize());
  const end = origin.clone().addScaledVector(raycaster.ray.direction, 12);

  if (!playing || !live) {
    const menuHit = raycaster.intersectObject(worldMenu.mesh, false);
    if (menuHit.length > 0 && worldMenu.mesh.visible && !playing) {
      audio.fire();
      if (controller) haptic(controller, 0.5, 40);
      beginRound();
    }
    return;
  }

  shots += 1;
  audio.fire();
  if (controller) haptic(controller, 0.22, 16);
  const hitsNow = raycaster.intersectObjects(targetMeshes(), false);
  if (hitsNow.length === 0) {
    fx.bolt(origin, end, 0x6aa8c8);
    audio.miss();
    combo = 1;
    comboTimer = 0;
    syncHud();
    return;
  }
  const hit = hitsNow[0];
  fx.bolt(origin, hit.point, 0xfff3a1);
  const mesh = hit.object as THREE.Mesh;
  const target = targets.find((t) => t.mesh === mesh);
  if (target) registerHit(target, hit.point, controller);
}

function fireFrom(controller: THREE.Object3D) {
  if (renderer.xr.isPresenting) fireCooldown = 0.12;
  tmpMatrix.identity().extractRotation(controller.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMatrix);
  tmpOrigin.setFromMatrixPosition(controller.matrixWorld);
  fireRay(tmpOrigin.clone(), tmpDir.clone(), controller);
}

function fireFromPointer(clientX: number, clientY: number) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
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
      (live && raycaster.intersectObjects(targetMeshes(), false).length > 0) ||
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

watchHeadset((state) => hud.setHeadsetState(state));
worldMenu.showIdle(best);
hud.setStats(0, 1, ROUND_SECONDS, best, 100);
paintBoard(0, 1, ROUND_SECONDS);

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const pulse = 0.65 + Math.sin(clock.elapsedTime * (live && timeLeft <= 10 ? 8 : 2)) * 0.35;
  lights.hot.intensity = 8 + pulse * 4;
  lights.accent.intensity = 8 + (1 - pulse) * 3;

  if (renderer.xr.isPresenting) {
    fireCooldown -= dt;
    for (const controller of controllers) {
      const pad = (controller.userData.inputSource as XRInputSource | undefined)?.gamepad;
      if (pad?.buttons[0]?.pressed && fireCooldown <= 0) {
        fireFrom(controller);
        fireCooldown = 0.12;
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
    const haste = 1 + (ROUND_SECONDS - timeLeft) * 0.018;
    for (const target of targets) {
      if (!target.alive) continue;
      target.life -= dt;
      const goal = target.kind === "gold" ? 0.72 : target.kind === "rush" ? 0.62 : 1;
      target.mesh.scale.setScalar(THREE.MathUtils.lerp(target.mesh.scale.x, goal, 1 - Math.pow(0.0008, dt)));
      target.mesh.position.addScaledVector(target.velocity, dt * haste);
      if (Math.abs(target.mesh.position.x) > 3.6) target.velocity.x *= -1;
      if (target.mesh.position.y < 0.9 || target.mesh.position.y > 2.9) target.velocity.y *= -1;
      if (target.mesh.position.z > -3.2) target.velocity.z = -Math.abs(target.velocity.z);
      target.mesh.lookAt(eye.x, target.mesh.position.y, eye.z);
      target.ring.rotation.z += dt * (target.kind === "gold" ? 3.2 : 1.6);
      if (target.life <= 0) spawnTarget(target);
    }
  } else if (worldMenu.mesh.visible) {
    worldMenu.mesh.lookAt(aimPoint());
  }

  fx.update(dt);
  renderer.render(scene, camera);
});
