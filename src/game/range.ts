import * as THREE from "three";

type Lamp = { group: THREE.Group; phase: number };
type Runner = { mesh: THREE.Mesh; lane: number; t: number };

export type RangeWorld = {
  accent: THREE.PointLight;
  hot: THREE.PointLight;
  update: (time: number, dt: number, urgent: boolean) => void;
};

export function buildRange(scene: THREE.Scene): RangeWorld {
  scene.add(new THREE.HemisphereLight(0x88c8ff, 0x0a1220, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(-2, 6, 3);
  scene.add(key);

  const accent = new THREE.PointLight(0x39e7ff, 11, 18);
  accent.position.set(-3.2, 2.5, -5);
  scene.add(accent);
  const hot = new THREE.PointLight(0xff4d8d, 10, 16);
  hot.position.set(3.2, 2.5, -5);
  scene.add(hot);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(10, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b1420, roughness: 0.92, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(16, 24, 0x1b4d66, 0x102433);
  grid.position.y = 0.012;
  scene.add(grid);

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 8),
    new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 1 }),
  );
  back.position.set(0, 3.2, -10.5);
  scene.add(back);

  for (const x of [-7.4, 7.4]) {
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 7),
      new THREE.MeshStandardMaterial({ color: 0x071018, roughness: 1 }),
    );
    wall.position.set(x, 2.8, -4);
    wall.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(wall);
  }

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 14),
    new THREE.MeshStandardMaterial({ color: 0x060910, roughness: 1 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.6, -4);
  scene.add(ceiling);

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x102030,
    emissive: 0x39e7ff,
    emissiveIntensity: 0.22,
    roughness: 0.4,
  });
  for (const x of [-4.4, 4.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 8.5), railMat);
    rail.position.set(x, 1.3, -5.2);
    scene.add(rail);
  }

  const stall = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.12, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.55, metalness: 0.2 }),
  );
  stall.position.set(0, 0.92, -1.15);
  scene.add(stall);
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.06, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x39e7ff,
      emissive: 0x39e7ff,
      emissiveIntensity: 0.7,
    }),
  );
  lip.position.set(0, 0.99, -0.82);
  scene.add(lip);

  const padGeo = new THREE.RingGeometry(0.32, 0.4, 28);
  const padMat = new THREE.MeshBasicMaterial({ color: 0x39e7ff, side: THREE.DoubleSide });
  for (const x of [-2.2, 0, 2.2]) {
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.03, 0.15);
    scene.add(pad);
  }

  const neon = new THREE.MeshStandardMaterial({
    color: 0xff4d8d,
    emissive: 0xff4d8d,
    emissiveIntensity: 0.95,
  });
  const hoops: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 24), neon);
    hoop.position.set(-6.2 + i * 3.1, 3.8, -9.6);
    scene.add(hoop);
    hoops.push(hoop);
  }

  scene.add(makeSign("RANGE OPEN", -5.4, 2.4, -8.8, 0.4));
  scene.add(makeSign("KEEP COMBO", 5.4, 2.4, -8.8, -0.4));

  const lamps: Lamp[] = [];
  for (let i = 0; i < 6; i++) {
    const group = new THREE.Group();
    const x = -3.5 + i * 1.4;
    group.position.set(x, 3.55, -3.2);
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6),
      new THREE.MeshBasicMaterial({ color: 0x1b2430 }),
    );
    cord.position.y = 0.2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfff1b0,
        emissive: 0xffc857,
        emissiveIntensity: 1.2,
      }),
    );
    bulb.position.y = -0.2;
    group.add(cord, bulb);
    scene.add(group);
    lamps.push({ group, phase: i * 0.7 });
  }

  const runners: Runner[] = [];
  for (let lane = 0; lane < 3; lane++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.7),
      new THREE.MeshBasicMaterial({ color: lane === 1 ? 0xff4d8d : 0x39e7ff }),
    );
    mesh.position.set(-2.4 + lane * 2.4, 0.04, -4);
    scene.add(mesh);
    runners.push({ mesh, lane, t: lane * 0.33 });

    const track = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.015, 7.2),
      new THREE.MeshStandardMaterial({
        color: 0x102030,
        emissive: lane === 1 ? 0xff4d8d : 0x39e7ff,
        emissiveIntensity: 0.35,
      }),
    );
    track.position.set(-2.4 + lane * 2.4, 0.025, -5.4);
    scene.add(track);
  }

  const dust = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.012, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x8ec8ff, transparent: true, opacity: 0.35 }),
    70,
  );
  const dummy = new THREE.Object3D();
  const dustPos: THREE.Vector3[] = [];
  for (let i = 0; i < 70; i++) {
    const p = new THREE.Vector3((Math.random() - 0.5) * 10, 0.4 + Math.random() * 3.2, -1 - Math.random() * 8);
    dustPos.push(p);
    dummy.position.copy(p);
    dummy.updateMatrix();
    dust.setMatrixAt(i, dummy.matrix);
  }
  scene.add(dust);

  return {
    accent,
    hot,
    update(time, _dt, urgent) {
      const pulse = 0.65 + Math.sin(time * (urgent ? 8 : 2)) * 0.35;
      hot.intensity = 8 + pulse * 4;
      accent.intensity = 8 + (1 - pulse) * 3;
      for (const hoop of hoops) hoop.rotation.z = time * 0.35;
      for (const lamp of lamps) {
        lamp.group.rotation.z = Math.sin(time * 1.3 + lamp.phase) * 0.12;
        lamp.group.rotation.x = Math.cos(time * 0.9 + lamp.phase) * 0.04;
      }
      for (const runner of runners) {
        const z = -2.2 - ((time * 1.6 + runner.t * 7) % 7.2);
        runner.mesh.position.z = z;
      }
      for (let i = 0; i < dustPos.length; i++) {
        const p = dustPos[i];
        p.y += Math.sin(time * 0.4 + i) * 0.002;
        p.x += Math.sin(time * 0.15 + i * 0.3) * 0.002;
        dummy.position.copy(p);
        dummy.updateMatrix();
        dust.setMatrixAt(i, dummy.matrix);
      }
      dust.instanceMatrix.needsUpdate = true;
    },
  };
}

function makeSign(text: string, x: number, y: number, z: number, rotY: number) {
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
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
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
