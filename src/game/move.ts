import * as THREE from "three";

const BOUNDS = { x: 3.4, zMin: -1.8, zMax: 1.6 };
const WALK = 2.4;
const SNAP = THREE.MathUtils.degToRad(30);

export class Locomotion {
  readonly keys = new Set<string>();
  private snapReady = true;
  private readonly look = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly rig: THREE.Group;

  constructor(rig: THREE.Group) {
    this.rig = rig;
    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
  }

  update(
    dt: number,
    camera: THREE.Camera,
    presenting: boolean,
    pads: Array<Gamepad | undefined>,
  ) {
    let ax = 0;
    let az = 0;
    let snap = 0;

    if (presenting) {
      const movePad = pads[0] ?? pads[1];
      const turnPad = pads[1] ?? pads[0];
      const move = readStick(movePad);
      const turn = readStick(turnPad);
      ax += move.x;
      az -= move.y;
      if (Math.abs(turn.x) > 0.72 && Math.abs(turn.y) < 0.45) {
        snap = Math.sign(turn.x);
      }
    } else {
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) ax -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) ax += 1;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) az -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) az += 1;
      if (this.keys.has("KeyQ")) snap -= 1;
      if (this.keys.has("KeyE")) snap += 1;
    }

    if (snap !== 0 && this.snapReady) {
      this.rig.rotation.y -= snap * SNAP;
      this.snapReady = false;
    }
    if (snap === 0) this.snapReady = true;

    if (ax === 0 && az === 0) return;

    camera.getWorldDirection(this.look);
    this.look.y = 0;
    if (this.look.lengthSq() < 0.0001) this.look.set(0, 0, -1);
    this.look.normalize();
    this.right.set(this.look.z, 0, -this.look.x);

    const len = Math.hypot(ax, az) || 1;
    this.rig.position.addScaledVector(this.right, (ax / len) * WALK * dt);
    this.rig.position.addScaledVector(this.look, (az / len) * WALK * dt);
    this.rig.position.x = THREE.MathUtils.clamp(this.rig.position.x, -BOUNDS.x, BOUNDS.x);
    this.rig.position.z = THREE.MathUtils.clamp(this.rig.position.z, BOUNDS.zMin, BOUNDS.zMax);
  }
}

function readStick(pad?: Gamepad) {
  if (!pad || pad.axes.length < 2) return { x: 0, y: 0 };
  const x = pad.axes.length >= 4 ? pad.axes[2] : pad.axes[0];
  const y = pad.axes.length >= 4 ? pad.axes[3] : pad.axes[1];
  const dead = 0.18;
  return {
    x: Math.abs(x) > dead ? x : 0,
    y: Math.abs(y) > dead ? y : 0,
  };
}
