import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const gltf = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

export async function loadModel(url: string): Promise<THREE.Group> {
  const hit = cache.get(url);
  if (hit) return hit;
  const asset = await gltf.loadAsync(url);
  cache.set(url, asset.scene);
  return asset.scene;
}

export function instance(source: THREE.Group, scale = 1): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = false;
      child.receiveShadow = true;
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m) => m.clone());
      } else {
        child.material = child.material.clone();
      }
    }
  });
  clone.scale.setScalar(scale);
  return clone;
}

export function place(
  scene: THREE.Scene,
  source: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotY = 0,
  scale = 1,
): THREE.Group {
  const node = instance(source, scale);
  node.position.set(x, y, z);
  node.rotation.y = rotY;
  scene.add(node);
  return node;
}
