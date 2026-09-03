import * as THREE from "three";

export function buildRange(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0x88c8ff, 0x0a1220, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(-2, 6, 3);
  scene.add(key);

  const accent = new THREE.PointLight(0x39e7ff, 10, 16);
  accent.position.set(-3.2, 2.6, -5);
  scene.add(accent);
  const hot = new THREE.PointLight(0xff4d8d, 10, 16);
  hot.position.set(3.2, 2.6, -5);
  scene.add(hot);

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

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x102030,
    emissive: 0x39e7ff,
    emissiveIntensity: 0.18,
    roughness: 0.4,
  });
  for (const x of [-4.4, 4.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 8.5), railMat);
    rail.position.set(x, 1.3, -5.2);
    scene.add(rail);
  }

  const neon = new THREE.MeshStandardMaterial({
    color: 0xff4d8d,
    emissive: 0xff4d8d,
    emissiveIntensity: 0.9,
  });
  for (let i = 0; i < 5; i++) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 24), neon);
    hoop.position.set(-6.2 + i * 3.1, 3.8, -9.6);
    scene.add(hoop);
  }

  const sign = makeSign("RANGE OPEN");
  sign.position.set(-5.4, 2.4, -8.8);
  sign.rotation.y = 0.4;
  scene.add(sign);
  const sign2 = makeSign("KEEP COMBO");
  sign2.position.set(5.4, 2.4, -8.8);
  sign2.rotation.y = -0.4;
  scene.add(sign2);

  return { accent, hot };
}

function makeSign(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#39e7ff";
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = "#39e7ff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 256, 82);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.45),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }),
  );
  return mesh;
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
