// Loads the violin model (GLB). The contract with any model, free or bought:
// each top-level node is named with a part id from data/parts.js.
// Parts drawn on another part's texture (f-holes and purfling on the top) point at that host part.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PART_IDS } from "../data/parts.js";

export const MODEL_URL = new URL("../../models/violin.glb", import.meta.url).href;

// Part id -> part whose mesh shows it, for parts with no mesh of their own.
export const PART_HOSTS = { "f-holes": "top", purfling: "top" };

// Each mesh gets its own material copy, so a glow on one part never lights another.
function ownMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.material = child.material.clone();
  });
}

export function prepareModel(scene) {
  const root = new THREE.Group();
  root.name = "violin-root";
  [...scene.children].forEach((node) => {
    if (!PART_IDS.includes(node.name)) return;
    node.userData.partId = node.name;
    ownMaterials(node);
    root.add(node);
  });
  return root;
}

export async function loadViolinModel(url = MODEL_URL) {
  const gltf = await new GLTFLoader().loadAsync(url);
  return prepareModel(gltf.scene);
}
