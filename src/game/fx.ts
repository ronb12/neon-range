import * as THREE from "three";

type Spark = { pos: THREE.Vector3; vel: THREE.Vector3; t: number; color: THREE.Color };
type Floater = { sprite: THREE.Sprite; t: number };
type Bolt = { line: THREE.Line; t: number };

export class Fx {
  private readonly dummy = new THREE.Object3D();
  private readonly sparks: THREE.InstancedMesh;
  private readonly sparkLife: Spark[] = [];
  private readonly floaters: Floater[] = [];
  private readonly bolts: Bolt[] = [];
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sparks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.028, 0.028, 0.028),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      120,
    );
    this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < 120; i++) this.sparks.setColorAt(i, new THREE.Color(0xffffff));
    scene.add(this.sparks);
  }

  burst(at: THREE.Vector3, hex: number, count = 18) {
    const color = new THREE.Color(hex);
    for (let i = 0; i < count; i++) {
      this.sparkLife.push({
        pos: at.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 3.4, (Math.random() - 0.5) * 5),
        t: 0.5,
        color,
      });
    }
  }

  bolt(from: THREE.Vector3, to: THREE.Vector3, hex = 0xfff3a1) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 1 }));
    this.scene.add(line);
    this.bolts.push({ line, t: 0.09 });
  }

  floatScore(at: THREE.Vector3, text: string, hex: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = `#${hex.toString(16).padStart(6, "0")}`;
    ctx.font = "bold 64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 128, 82);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    sprite.position.copy(at).add(new THREE.Vector3(0, 0.2, 0.1));
    sprite.scale.set(0.7, 0.35, 1);
    this.scene.add(sprite);
    this.floaters.push({ sprite, t: 0.7 });
  }

  update(dt: number) {
    for (let i = this.sparkLife.length - 1; i >= 0; i--) {
      const s = this.sparkLife[i];
      s.t -= dt;
      s.pos.addScaledVector(s.vel, dt);
      s.vel.y -= 7 * dt;
      this.dummy.position.copy(s.pos);
      this.dummy.scale.setScalar(Math.max(0.01, s.t * 2.2));
      this.dummy.updateMatrix();
      this.sparks.setMatrixAt(i, this.dummy.matrix);
      this.sparks.setColorAt(i, s.color);
      if (s.t <= 0) this.sparkLife.splice(i, 1);
    }
    this.sparks.count = this.sparkLife.length;
    this.sparks.instanceMatrix.needsUpdate = true;
    if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t -= dt;
      f.sprite.position.y += dt * 0.7;
      (f.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, f.t / 0.7);
      if (f.t <= 0) {
        this.scene.remove(f.sprite);
        (f.sprite.material as THREE.SpriteMaterial).map?.dispose();
        f.sprite.material.dispose();
        this.floaters.splice(i, 1);
      }
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.t -= dt;
      (b.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, b.t / 0.09);
      if (b.t <= 0) {
        this.scene.remove(b.line);
        b.line.geometry.dispose();
        (b.line.material as THREE.LineBasicMaterial).dispose();
        this.bolts.splice(i, 1);
      }
    }
  }
}
