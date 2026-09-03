import * as THREE from "three";
import { instance, loadModel } from "./loader.ts";

export class LaserGun {
  readonly root: THREE.Group;
  readonly muzzle: THREE.Object3D;
  private recoil = 0;
  private flash: THREE.PointLight;
  private glow: THREE.Mesh;
  private readonly rest = new THREE.Vector3(0, -0.04, 0.02);

  constructor(model: THREE.Group) {
    this.root = instance(model, 0.42);
    // No flip — barrel already faces -Z (forward) in the Kenney GLB
    this.root.rotation.set(0, 0, 0);
    this.root.position.set(0, -0.04, -0.06);

    this.muzzle = new THREE.Object3D();
    // Barrel tip is roughly 0.22 m forward of the grip centre at model scale 0.42
    this.muzzle.position.set(0, 0.028, -0.22);
    this.root.add(this.muzzle);

    this.flash = new THREE.PointLight(0x7af6ff, 0, 1.6);
    this.muzzle.add(this.flash);

    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xb8ffff }),
    );
    this.glow.visible = false;
    this.muzzle.add(this.glow);
  }

  attach(parent: THREE.Object3D) {
    parent.add(this.root);
  }

  setDesktopPose() {
    // Lower-right viewmodel: slightly tilted, barrel pointing forward (-Z)
    this.rest.set(0.18, -0.18, -0.32);
    this.root.position.copy(this.rest);
    this.root.rotation.set(-0.06, 0.12, 0.04);
  }

  kick() {
    this.recoil = 1;
    this.flash.intensity = 8;
    this.glow.visible = true;
  }

  update(dt: number) {
    this.recoil = Math.max(0, this.recoil - dt * 8);
    this.root.position.set(this.rest.x, this.rest.y, this.rest.z + this.recoil * 0.05);
    this.flash.intensity = this.recoil * 8;
    this.glow.visible = this.recoil > 0.35;
  }

  muzzleWorld(target = new THREE.Vector3()) {
    return this.muzzle.getWorldPosition(target);
  }
}

export async function loadLaserGunModel() {
  return loadModel("/assets/models/blaster/blaster-g.glb");
}
