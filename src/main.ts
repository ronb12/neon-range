import "./style.css";
import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { RangeAudio } from "./game/audio.ts";
import { Hud } from "./game/hud.ts";
import { WorldMenu } from "./game/worldMenu.ts";
import { headsetAvailable, startHeadsetSession, watchHeadset } from "./game/xr.ts";

const ROUND_SECONDS = 45;
const TARGET_COUNT = 8;

type Target = {
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  velocity: THREE.Vector3;
  alive: boolean;
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
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05080f);
scene.fog = new THREE.Fog(0x05080f, 8, 28);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 80);
camera.position.set(0, 1.6, 0.35);
scene.add(camera);
scene.add(worldMenu.mesh);

scene.add(new THREE.HemisphereLight(0x88c8ff, 0x0a1220, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(-2, 6, 3);
scene.add(key);
const rim = new THREE.PointLight(0xff4d8d, 8, 18);
rim.position.set(0, 2.4, -6);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(10, 48),
  new THREE.MeshStandardMaterial({ color: 0x0b1420, roughness: 0.92, metalness: 0.05 }),
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(16, 24, 0x1b4d66, 0x102433);
grid.position.y = 0.01;
scene.add(grid);

const back = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 8),
  new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 1 }),
);
back.position.set(0, 3.2, -10.5);
scene.add(back);

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

function paintBoard(score: number, combo: number, time: number) {
  boardCtx.fillStyle = "#071018";
  boardCtx.fillRect(0, 0, 1024, 256);
  boardCtx.strokeStyle = "#39e7ff";
  boardCtx.lineWidth = 6;
  boardCtx.strokeRect(18, 18, 988, 220);
  boardCtx.fillStyle = "#8aa3b8";
  boardCtx.font = "28px sans-serif";
  boardCtx.fillText("NEON RANGE", 48, 70);
  boardCtx.fillStyle = "#e8f4ff";
  boardCtx.font = "bold 72px sans-serif";
  boardCtx.fillText(String(score).padStart(4, "0"), 48, 170);
  boardCtx.font = "bold 48px sans-serif";
  boardCtx.fillText(`x${combo}`, 420, 166);
  boardCtx.fillText(`${Math.max(0, Math.ceil(time))}s`, 620, 166);
  boardTex.needsUpdate = true;
}

const dummy = new THREE.Object3D();
const sparks = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.03, 0.03, 0.03),
  new THREE.MeshBasicMaterial({ color: 0xfff1a8 }),
  80,
);
sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(sparks);
const sparkLife: { pos: THREE.Vector3; vel: THREE.Vector3; t: number }[] = [];

function burst(at: THREE.Vector3, color: number) {
  (sparks.material as THREE.MeshBasicMaterial).color.setHex(color);
  for (let i = 0; i < 16; i++) {
    sparkLife.push({
      pos: at.clone(),
      vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4),
      t: 0.45,
    });
  }
}

const targetGeo = new THREE.CircleGeometry(0.38, 32);
const ringGeo = new THREE.RingGeometry(0.4, 0.46, 32);
const targets: Target[] = [];

function aimPoint() {
  const pos = new THREE.Vector3();
  camera.getWorldPosition(pos);
  return pos;
}

function randomLane() {
  return {
    x: (Math.random() - 0.5) * 6.4,
    y: 1.05 + Math.random() * 1.7,
    z: -4.2 - Math.random() * 4.6,
  };
}

function makeTarget(): Target {
  const hue = Math.random() > 0.5 ? 0x39e7ff : 0xff4d8d;
  const mesh = new THREE.Mesh(
    targetGeo,
    new THREE.MeshStandardMaterial({
      color: hue,
      emissive: hue,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  );
  mesh.add(ring);
  scene.add(mesh);
  const target: Target = {
    mesh,
    ring,
    velocity: new THREE.Vector3(),
    alive: false,
  };
  hideTarget(target);
  return target;
}

function hideTarget(target: Target) {
  target.alive = false;
  target.mesh.visible = false;
  target.mesh.position.set(0, -4, -8);
}

function spawnTarget(target: Target) {
  const lane = randomLane();
  const eye = aimPoint();
  target.alive = true;
  target.mesh.visible = true;
  target.mesh.position.set(lane.x, lane.y, lane.z);
  target.mesh.lookAt(eye.x, lane.y, eye.z);
  const hue = Math.random() > 0.35 ? 0x39e7ff : 0xff4d8d;
  const mat = target.mesh.material as THREE.MeshStandardMaterial;
  mat.color.setHex(hue);
  mat.emissive.setHex(hue);
  target.velocity.set((Math.random() - 0.5) * 1.3, (Math.random() - 0.5) * 0.55, 0);
}

for (let i = 0; i < TARGET_COUNT; i++) targets.push(makeTarget());

const targetMeshes = () => targets.filter((t) => t.alive).map((t) => t.mesh);

const controllerFactory = new XRControllerModelFactory();
const controllers: THREE.XRTargetRaySpace[] = [];

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
}

setupController(0);
setupController(1);

renderer.xr.addEventListener("sessionstart", () => {
  document.body.classList.add("in-xr");
  renderer.setPixelRatio(1);
  hud.setHeadsetState("presenting");
  if (!playing) resetRound();
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

let playing = false;
let score = 0;
let combo = 1;
let bestCombo = 1;
let hits = 0;
let timeLeft = ROUND_SECONDS;
let comboTimer = 0;
let pointerHeld = false;
let fireCooldown = 0;

function resetRound() {
  score = 0;
  combo = 1;
  bestCombo = 1;
  hits = 0;
  timeLeft = ROUND_SECONDS;
  comboTimer = 0;
  playing = true;
  worldMenu.setVisible(false);
  hud.setPlaying(true);
  targets.forEach(spawnTarget);
  hud.setStats(score, combo, timeLeft);
  paintBoard(score, combo, timeLeft);
}

function finishRound() {
  playing = false;
  pointerHeld = false;
  audio.end();
  targets.forEach(hideTarget);
  worldMenu.showAgain(score);
  worldMenu.setVisible(true);
  hud.setPlaying(false);
  hud.showEnd(score, hits, bestCombo);
  paintBoard(score, combo, 0);
}

function registerHit(target: Target, controller?: THREE.Object3D) {
  const bonus = target.mesh.position.distanceTo(aimPoint()) > 7 ? 40 : 0;
  score += 100 * combo + bonus;
  hits += 1;
  combo += 1;
  bestCombo = Math.max(bestCombo, combo);
  comboTimer = 1.15;
  burst(target.mesh.position, 0xfff3a1);
  audio.hit(combo);
  if (controller) haptic(controller, 0.85, 50);
  spawnTarget(target);
  hud.setStats(score, combo, timeLeft);
  paintBoard(score, combo, timeLeft);
}

function fireRay(origin: THREE.Vector3, direction: THREE.Vector3, controller?: THREE.Object3D) {
  raycaster.set(origin, direction.normalize());

  if (!playing) {
    const menuHit = raycaster.intersectObject(worldMenu.mesh, false);
    if (menuHit.length > 0 && worldMenu.mesh.visible) {
      audio.fire();
      if (controller) haptic(controller, 0.5, 40);
      resetRound();
    }
    return;
  }

  audio.fire();
  if (controller) haptic(controller, 0.25, 18);
  const hitsNow = raycaster.intersectObjects(targetMeshes(), false);
  if (hitsNow.length === 0) {
    audio.miss();
    combo = 1;
    comboTimer = 0;
    hud.setStats(score, combo, timeLeft);
    paintBoard(score, combo, timeLeft);
    return;
  }
  const mesh = hitsNow[0].object as THREE.Mesh;
  const target = targets.find((t) => t.mesh === mesh);
  if (target) registerHit(target, controller);
}

function fireFrom(controller: THREE.Object3D) {
  if (renderer.xr.isPresenting) fireCooldown = 0.12;
  tmpMatrix.identity().extractRotation(controller.matrixWorld);
  tmpDir.set(0, 0, -1).applyMatrix4(tmpMatrix);
  fireRay(new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld), tmpDir, controller);
}

function fireFromPointer(clientX: number, clientY: number) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  fireRay(raycaster.ray.origin.clone(), raycaster.ray.direction.clone());
}

document.querySelector("#start")!.addEventListener("click", () => {
  audio.fire();
  resetRound();
});
document.querySelector("#again")!.addEventListener("click", () => resetRound());
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
  pointerHeld = playing;
  fireCooldown = 0;
  fireFromPointer(event.clientX, event.clientY);
});
window.addEventListener("pointerup", () => {
  pointerHeld = false;
});
window.addEventListener("pointermove", (event) => {
  if (!pointerHeld || !playing || renderer.xr.isPresenting) return;
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

const clock = new THREE.Clock();
paintBoard(0, 1, ROUND_SECONDS);

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (renderer.xr.isPresenting) {
    fireCooldown -= dt;
    for (const controller of controllers) {
      const pad = (controller.userData.inputSource as XRInputSource | undefined)?.gamepad;
      if (pad?.buttons[0]?.pressed && fireCooldown <= 0) {
        fireFrom(controller);
        fireCooldown = 0.12;
      }
    }
  }

  if (playing) {
    timeLeft -= dt;
    comboTimer -= dt;
    if (!renderer.xr.isPresenting) fireCooldown -= dt;
    if (comboTimer <= 0) combo = 1;
    if (timeLeft <= 0) finishRound();
    hud.setStats(score, combo, timeLeft);
    paintBoard(score, combo, timeLeft);

    const eye = aimPoint();
    for (const target of targets) {
      if (!target.alive) continue;
      target.mesh.position.addScaledVector(target.velocity, dt);
      if (Math.abs(target.mesh.position.x) > 3.5) target.velocity.x *= -1;
      if (target.mesh.position.y < 0.9 || target.mesh.position.y > 2.9) target.velocity.y *= -1;
      target.mesh.lookAt(eye.x, target.mesh.position.y, eye.z);
      target.ring.rotation.z += dt * 1.6;
    }
  } else if (worldMenu.mesh.visible) {
    worldMenu.mesh.lookAt(aimPoint());
  }

  for (let i = sparkLife.length - 1; i >= 0; i--) {
    const s = sparkLife[i];
    s.t -= dt;
    s.pos.addScaledVector(s.vel, dt);
    s.vel.y -= 6 * dt;
    dummy.position.copy(s.pos);
    dummy.scale.setScalar(Math.max(0.01, s.t * 2));
    dummy.updateMatrix();
    sparks.setMatrixAt(i, dummy.matrix);
    if (s.t <= 0) sparkLife.splice(i, 1);
  }
  sparks.count = sparkLife.length;
  sparks.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
});
