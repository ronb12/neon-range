import * as THREE from "three";
import { loadModel, place } from "./loader.ts";

export async function buildRange(scene: THREE.Scene) {
  const [
    floor,
    floorPanel,
    wall,
    wallDetail,
    wallWindow,
    pillar,
    rail,
    crateM,
    crateS,
    computer,
    computerWide,
    door,
    barrier,
    pipe,
    display,
  ] = await Promise.all([
    loadModel("/assets/models/floor.glb"),
    loadModel("/assets/models/floor-panel.glb"),
    loadModel("/assets/models/wall.glb"),
    loadModel("/assets/models/wall-detail.glb"),
    loadModel("/assets/models/wall-window.glb"),
    loadModel("/assets/models/wall-pillar.glb"),
    loadModel("/assets/models/rail.glb"),
    loadModel("/assets/models/crate-medium.glb"),
    loadModel("/assets/models/crate-small.glb"),
    loadModel("/assets/models/computer.glb"),
    loadModel("/assets/models/computer-wide.glb"),
    loadModel("/assets/models/door-single-closed.glb"),
    loadModel("/assets/models/structure-barrier.glb"),
    loadModel("/assets/models/pipe.glb"),
    loadModel("/assets/models/display-wall.glb"),
  ]);

  const tile = 2;
  for (let x = -4; x <= 4; x++) {
    for (let z = -5; z <= 1; z++) {
      const src = (x + z) % 2 === 0 ? floor : floorPanel;
      place(scene, src, x * tile, 0, z * tile, 0, 1);
    }
  }

  for (let x = -4; x <= 4; x++) {
    const src = x === 0 ? wallWindow : x % 2 === 0 ? wallDetail : wall;
    place(scene, src, x * tile, 0, -10.2, 0, 1);
  }
  place(scene, pillar, -8.2, 0, -10.2, 0, 1);
  place(scene, pillar, 8.2, 0, -10.2, 0, 1);
  place(scene, door, -8.2, 0, -6, Math.PI / 2, 1);
  place(scene, door, 8.2, 0, -6, -Math.PI / 2, 1);

  for (const x of [-4.2, 4.2]) {
    place(scene, rail, x, 0, -4.5, 0, 1);
    place(scene, rail, x, 0, -6.5, 0, 1);
  }

  place(scene, barrier, -1.4, 0, -1.6, 0, 0.85);
  place(scene, barrier, 1.4, 0, -1.6, 0, 0.85);

  place(scene, crateM, -3.2, 0, -3.4, 0.2, 1);
  place(scene, crateS, 3.1, 0, -3.2, -0.3, 1);
  place(scene, crateM, 0.2, 0, -8.6, 0.1, 1);

  place(scene, computerWide, -6.6, 0, -8.8, 0.4, 1);
  place(scene, computer, 6.6, 0, -8.8, -0.4, 1);
  place(scene, display, 0, 1.1, -10.05, 0, 1.2);

  for (const x of [-6, -2, 2, 6]) {
    place(scene, pipe, x, 2.7, -9.4, Math.PI / 2, 1);
  }

  scene.add(new THREE.HemisphereLight(0x9ad4ff, 0x121820, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(-3, 7, 2);
  scene.add(key);
  const accent = new THREE.PointLight(0x39e7ff, 12, 18);
  accent.position.set(-3.4, 2.4, -5);
  scene.add(accent);
  const hot = new THREE.PointLight(0xff4d8d, 10, 16);
  hot.position.set(3.4, 2.4, -5);
  scene.add(hot);

  return { accent, hot };
}

const BEST_KEY = "neon-range-best";

export function loadBest(): number {
  const raw = localStorage.getItem(BEST_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function saveBest(score: number): number {
  const best = Math.max(loadBest(), score);
  localStorage.setItem(BEST_KEY, String(best));
  return best;
}
