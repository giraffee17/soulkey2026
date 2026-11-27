import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildStandinViolin, partIdOf } from "../frontend-pages/public/js/scene/violin-standin.js";
import catalog from "../api-worker/content/parts.json" with { type: "json" };

const PART_IDS = catalog.parts.map((part) => part.id);

const palette = { wood: "#7a3e1b", maple: "#a8662e", ebony: "#15100c", metal: "#b9b2a3", string: "#d8c9a3", hair: "#efe6d2", ivory: "#e9dfc8", highlight: "#c9a54c" };

test("the stand-in has exactly one object for every part id", () => {
  const violin = buildStandinViolin(palette);
  const ids = violin.children.map((child) => child.userData.partId);
  assert.deepEqual([...ids].sort(), [...PART_IDS].sort());
});

test("every mesh belongs to a part, so any click resolves to a part id", () => {
  const violin = buildStandinViolin(palette);
  violin.traverse((object) => {
    if (object.isMesh) assert.ok(PART_IDS.includes(partIdOf(object)), `mesh without part: ${object.name}`);
  });
});

test("every part has real size, so it can be clicked and framed by the camera", () => {
  const violin = buildStandinViolin(palette);
  violin.children.forEach((child) => {
    const size = new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3());
    assert.ok(size.length() > 0.5, `${child.userData.partId} is too small`);
    assert.ok(Number.isFinite(size.length()), `${child.userData.partId} has broken geometry`);
  });
});

test("the soundpost sits inside the body, under the E string side", () => {
  const violin = buildStandinViolin(palette);
  violin.updateMatrixWorld(true);
  const post = new THREE.Box3().setFromObject(violin.getObjectByName("soundpost"));
  const body = new THREE.Box3();
  ["top", "back", "ribs"].forEach((name) => body.union(new THREE.Box3().setFromObject(violin.getObjectByName(name))));
  assert.ok(body.containsBox(post), "soundpost pokes out of the body");
  const gString = new THREE.Box3().setFromObject(violin.getObjectByName("string-g")).getCenter(new THREE.Vector3());
  const eString = new THREE.Box3().setFromObject(violin.getObjectByName("string-e")).getCenter(new THREE.Vector3());
  const postCenter = post.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(postCenter.x - eString.x) < Math.abs(postCenter.x - gString.x));
});
