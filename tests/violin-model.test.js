import { test } from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import * as THREE from "three";
import { NodeIO } from "@gltf-transform/core";
import { KHRMaterialsClearcoat } from "@gltf-transform/extensions";
import { PART_IDS } from "../frontend-pages/public/js/data/parts.js";
import { PART_HOSTS, prepareModel } from "../frontend-pages/public/js/scene/violin-model.js";

const MODEL = new URL("../frontend-pages/public/models/violin.glb", import.meta.url);

test("the model has a node for every part, or a host part that shows it", async () => {
  const doc = await new NodeIO().registerExtensions([KHRMaterialsClearcoat]).read(MODEL.pathname);
  const names = doc.getRoot().listNodes().map((node) => node.getName());
  for (const id of PART_IDS) {
    const shownBy = names.includes(id) ? id : PART_HOSTS[id];
    assert.ok(shownBy && names.includes(shownBy), `no mesh shows ${id}`);
  }
  names.forEach((name) => assert.ok(PART_IDS.includes(name), `unknown node ${name}`));
});

test("the model is small enough for phones (under 3 MB)", async () => {
  const { size } = await stat(MODEL);
  assert.ok(size < 3 * 1024 * 1024, `violin.glb is ${(size / 1024 / 1024).toFixed(1)} MB`);
});

test("prepareModel keeps only part nodes and gives each mesh its own material", () => {
  const shared = new THREE.MeshStandardMaterial();
  const scene = new THREE.Group();
  ["bridge", "top", "camera-helper"].forEach((name) => {
    const node = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    node.name = name;
    scene.add(node);
  });
  const root = prepareModel(scene);
  assert.deepEqual(root.children.map((child) => child.userData.partId), ["bridge", "top"]);
  assert.notEqual(root.children[0].material, root.children[1].material);
});
