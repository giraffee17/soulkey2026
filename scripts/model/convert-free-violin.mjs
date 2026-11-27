// Converts the free violin model (VIOLIN_L.3DS, a 3D Studio file with JPG textures)
// into frontend-pages/public/models/violin.glb, with one node per part id from PLAN.md.
//
// Usage: node scripts/model/convert-free-violin.mjs <folder with VIOLIN_L.3DS and the JPGs>
//
// The source files are not committed (third-party asset); only the converted GLB is.
// The original model groups parts by material, so this script splits it:
//   connected pieces (strings, pegs, bridge...), position (neck, pegbox, scroll),
//   and facing (top, back, ribs). Parts the model doesn't have (nut, fine tuners,
//   soundpost, bass bar) are added as simple shapes. F-holes and purfling are painted
//   on the top texture, so the site points them at the top (see violin-model.js).
import * as THREE from "three";
import { TDSLoader } from "three/examples/jsm/loaders/TDSLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Document, NodeIO } from "@gltf-transform/core";
import { KHRMaterialsClearcoat } from "@gltf-transform/extensions";
import { dedup, prune, weld } from "@gltf-transform/functions";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import jpeg from "jpeg-js";
import catalog from "../../api-worker/content/parts.json" with { type: "json" };

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PART_IDS = catalog.parts.map((part) => part.id);
const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("Usage: node scripts/model/convert-free-violin.mjs <folder with VIOLIN_L.3DS>");
  process.exit(1);
}
const output = join(root, "frontend-pages", "public", "models", "violin.glb");

// The model is in arbitrary units; this makes the violin 59 cm long, like a real 4/4 violin.
const VIOLIN_LENGTH_CM = 59;

// Textures are only needed for browser loading; Node gets placeholders.
THREE.TextureLoader.prototype.load = function load(url) {
  const texture = new THREE.Texture();
  texture.name = url;
  return texture;
};

const file = await readFile(join(sourceDir, "VIOLIN_L.3DS"));
const model = new TDSLoader().parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), `${sourceDir}/`);
model.updateMatrixWorld(true);

// Every triangle of the model, in world space, with its 3DS mesh and material name.
function trianglesOf(mesh) {
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).toNonIndexed();
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count: position.count, materialIndex: 0 }];
  const triangles = [];
  for (const group of groups) {
    for (let first = group.start; first < group.start + group.count; first += 3) {
      const points = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(position, first + k));
      const uvs = uv ? [0, 1, 2].map((k) => new THREE.Vector2().fromBufferAttribute(uv, first + k)) : null;
      const center = points[0].clone().add(points[1]).add(points[2]).divideScalar(3);
      const normal = new THREE.Triangle(...points).getNormal(new THREE.Vector3());
      triangles.push({ mesh: mesh.name, material: materials[group.materialIndex].name, points, uvs, center, normal });
    }
  }
  return triangles;
}

// Groups triangles that share corners into separate pieces.
function pieces(triangles) {
  const key = (p) => `${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.z)}`;
  const parent = triangles.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map();
  triangles.forEach((triangle, i) => triangle.points.forEach((point) => {
    const id = key(point);
    if (owner.has(id)) parent[find(i)] = find(owner.get(id));
    else owner.set(id, i);
  }));
  const byRoot = new Map();
  triangles.forEach((triangle, i) => {
    const r = find(i);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(triangle);
  });
  return [...byRoot.values()].map((list) => {
    const box = new THREE.Box3();
    list.forEach((triangle) => triangle.points.forEach((point) => box.expandByPoint(point)));
    return { triangles: list, box, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
  });
}

const meshes = {};
model.traverse((object) => { if (object.isMesh) meshes[object.name] = trianglesOf(object); });

const parts = new Map();
const assign = (id, triangles) => parts.set(id, [...(parts.get(id) ?? []), ...triangles]);

// Black parts: saddle, chinrest, tailpiece, fingerboard.
const black = pieces(meshes.VIOLBLAC);
const fingerboard = black.reduce((a, b) => (a.size.y > b.size.y ? a : b));
const chinrest = black.filter((p) => p !== fingerboard).reduce((a, b) => (a.size.x * a.size.y > b.size.x * b.size.y ? a : b));
const saddle = black.filter((p) => p !== fingerboard && p !== chinrest).reduce((a, b) => (a.center.y < b.center.y ? a : b));
assign("fingerboard", fingerboard.triangles);
assign("chinrest", chinrest.triangles);
assign("saddle", saddle.triangles);
black.filter((p) => ![fingerboard, chinrest, saddle].includes(p)).forEach((p) => assign("tailpiece", p.triangles));
assign("tailpiece", meshes.VIOLTENS); // the tailgut loop
assign("end-button", meshes.VIOLMETA);

// Bridge and pegs.
const tuning = pieces(meshes.VIOLTUNN);
const bridge = tuning.reduce((a, b) => (a.center.y < b.center.y ? a : b));
assign("bridge", bridge.triangles);
// The file alternates light and dark pegs; real pegs are all dark wood.
tuning.filter((p) => p !== bridge).forEach((p) => assign("pegs", p.triangles.map((t) => ({ ...t, material: "GEN_PEG" }))));
const bridgeY = bridge.center.y;

// Strings: sorted by where they cross the bridge. The chinrest sits on the G string side.
const crossing = (piece) => {
  const near = piece.triangles.flatMap((t) => t.points).filter((p) => Math.abs(p.y - bridgeY) < 250);
  return near.reduce((sum, p) => sum + p.x, 0) / Math.max(1, near.length);
};
const gSideIsNegative = chinrest.center.x < bridge.center.x;
const strings = pieces(meshes.VIOLSTRI).sort((a, b) => (crossing(a) - crossing(b)) * (gSideIsNegative ? 1 : -1));
["string-g", "string-d", "string-a", "string-e"].forEach((id, i) => assign(id, strings[i].triangles));

// Body: top, back and ribs by facing and height (the old file's normals point inward).
const body = meshes.VIOL;
const bodyBox = new THREE.Box3();
body.forEach((t) => t.points.forEach((p) => bodyBox.expandByPoint(p)));
const bodyMidZ = (bodyBox.min.z + bodyBox.max.z) / 2;
body.forEach((source) => {
  // A few body faces use the neck material, but their texture coordinates belong to the body picture.
  const t = source.material === "lat" ? { ...source, material: "top" } : source;
  if (Math.abs(t.normal.z) < 0.5) assign("ribs", [t]);
  else assign(t.center.z > bodyMidZ ? "top" : "back", [t]);
});

// Neck, pegbox and scroll by height: the nut ends the fingerboard, the scroll starts above the pegs.
const nutY = fingerboard.box.max.y;
const pegsTopY = Math.max(...tuning.filter((p) => p !== bridge).map((p) => p.box.max.y));
meshes.VIOLNECK.forEach((t) => {
  if (t.center.y < nutY) assign("neck", [t]);
  else if (t.center.y < pegsTopY + 120) assign("pegbox", [t]);
  else assign("scroll", [t]);
});

// Bow: hair, then stick, frog, screw and tip by material and position.
assign("hair", meshes.VIOLBOW1);
const bow = meshes.VIOLBOW;
const frogTriangles = bow.filter((t) => t.material === "NEGRO");
const frogBox = new THREE.Box3();
frogTriangles.forEach((t) => t.points.forEach((p) => frogBox.expandByPoint(p)));
const bowTopY = Math.max(...bow.flatMap((t) => t.points.map((p) => p.y)));
const cm = (bodyBox.max.y - bodyBox.min.y) / 35.5; // model units per centimetre (body is 35.5 cm)
bow.forEach((t) => {
  if (t.center.y > bowTopY - 2.5 * cm) assign("tip", [t]);
  else if (t.center.y < frogBox.min.y) assign("screw", [t]);
  else if (t.material !== "CLABIJER" && t.center.y < frogBox.max.y) assign("frog", [t]);
  else assign("stick", [t]);
});

// Parts the free model doesn't have, built as simple shapes in model units.
function shape(geometry, position, material, rotation) {
  geometry.clearGroups();
  const mesh = new THREE.Mesh(geometry);
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.material = { name: material };
  mesh.updateMatrixWorld(true);
  return trianglesOf(mesh);
}

// Height of a surface at (x, y): the average height of its 3 nearest corners (the model is low poly).
const surfaceAt = (id, x, y) => {
  const nearest = parts.get(id).flatMap((t) => t.points)
    .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))
    .slice(0, 3);
  return nearest.reduce((sum, p) => sum + p.z, 0) / nearest.length;
};
const topAt = (x, y) => surfaceAt("top", x, y);
const backAt = (x, y) => surfaceAt("back", x, y);
const centerX = bridge.center.x;
const eSide = gSideIsNegative ? 1 : -1;

const boardTop = Math.max(...fingerboard.triangles.flatMap((t) => t.points).filter((p) => p.y > nutY - 0.5 * cm).map((p) => p.z));
assign("nut", shape(new THREE.BoxGeometry(fingerboard.size.x * 0.9, 0.5 * cm, 0.5 * cm), new THREE.Vector3(centerX, nutY + 0.25 * cm, boardTop + 0.1 * cm), "GEN_EBONY"));

const tailTriangles = parts.get("tailpiece");
const tailBox = new THREE.Box3();
tailTriangles.forEach((t) => t.points.forEach((p) => tailBox.expandByPoint(p)));
const tunerY = tailBox.max.y - 1.6 * cm;
[-1.5, -0.5, 0.5, 1.5].forEach((slot) => assign("fine-tuners", shape(
  new THREE.CylinderGeometry(0.18 * cm, 0.18 * cm, 0.9 * cm, 12),
  new THREE.Vector3(centerX + slot * 0.55 * cm, tunerY, tailBox.max.z + 0.3 * cm),
  "GEN_METAL",
  [Math.PI / 2, 0, 0],
)));

const postX = centerX + eSide * 1.0 * cm;
const postY = bridgeY - 0.8 * cm;
const postTop = topAt(postX, postY) - 0.05 * cm;
const postBottom = backAt(postX, postY) + 0.05 * cm;
assign("soundpost", shape(
  new THREE.CylinderGeometry(0.3 * cm, 0.3 * cm, postTop - postBottom, 16),
  new THREE.Vector3(postX, postY, (postTop + postBottom) / 2),
  "GEN_MAPLE",
  [Math.PI / 2, 0, 0],
));

// The bass bar runs along the inside of the arched top, so it sits under the arch's lowest point.
const barX = centerX - eSide * 1.1 * cm;
const barY = bridgeY + 2 * cm;
const barLength = 20 * cm;
const lowestTop = Math.min(...[-0.5, -0.25, 0, 0.25, 0.5].map((f) => topAt(barX, barY + f * barLength)));
assign("bass-bar", shape(
  new THREE.BoxGeometry(0.5 * cm, barLength, 0.6 * cm),
  new THREE.Vector3(barX, barY, lowestTop - 0.4 * cm),
  "GEN_MAPLE",
));

// Every part now has triangles, except f-holes and purfling (painted on the top).
const missing = PART_IDS.filter((id) => !parts.has(id) && !["f-holes", "purfling"].includes(id));
if (missing.length) throw new Error(`No triangles for: ${missing.join(", ")}`);

// Centre the whole scene and scale it to centimetres.
const all = new THREE.Box3();
parts.forEach((list) => list.forEach((t) => t.points.forEach((p) => all.expandByPoint(p))));
const violinLength = Math.max(...[...parts.entries()].filter(([id]) => !["stick", "hair", "frog", "screw", "tip"].includes(id)).flatMap(([, list]) => list.flatMap((t) => t.points.map((p) => p.y))))
  - bodyBox.min.y;
const scale = VIOLIN_LENGTH_CM / violinLength;
const center = all.getCenter(new THREE.Vector3());

// Materials: the old 3DS names mapped to PBR settings. Varnished wood gets a clear coat.
const MATERIALS = {
  top: { texture: "MADTOP.JPG", roughness: 0.4, coat: true },
  lat: { texture: "NECK.JPG", roughness: 0.4, coat: true },
  MASTIL: { texture: "MASTIL.JPG", roughness: 0.3 },
  CLABIJER1: { texture: "MADARCO.JPG", roughness: 0.35 },
  BLANCO: { color: [0.86, 0.84, 0.8], roughness: 0.5 },
  BLANCOT: { color: [0.82, 0.71, 0.53], roughness: 0.6 },
  negro1: { color: [0.02, 0.016, 0.012], roughness: 0.35 },
  NEGRO: { color: [0.03, 0.025, 0.02], roughness: 0.35 },
  NEGBUMT: { color: [0.15, 0.09, 0.04], roughness: 0.4 },
  CLABIJER: { color: [0.3, 0.12, 0.04], roughness: 0.35, coat: true },
  DORADO: { color: [0.76, 0.62, 0.33], metallic: 1, roughness: 0.3 },
  PELOARC: { color: [0.94, 0.92, 0.84], roughness: 0.9 },
  cromo: { color: [0.82, 0.78, 0.68], metallic: 0.8, roughness: 0.3 },
  GEN_EBONY: { color: [0.02, 0.016, 0.012], roughness: 0.35 },
  GEN_METAL: { color: [0.73, 0.7, 0.64], metallic: 1, roughness: 0.25 },
  GEN_MAPLE: { color: [0.66, 0.42, 0.2], roughness: 0.7 },
  GEN_PEG: { color: [0.1, 0.04, 0.025], roughness: 0.35 },
};

// The top texture is a photo of the violin on white. Faces near the edge sample that white,
// so every white pixel takes the colour of the nearest wood pixel in its row (or row above/below).
function fillWhiteBackground(bytes) {
  const image = jpeg.decode(bytes, { useTArray: true });
  const { width, height, data } = image;
  const isWhite = (i) => data[i] > 225 && data[i + 1] > 215 && data[i + 2] > 200;
  const rowRanges = [];
  for (let y = 0; y < height; y += 1) {
    let first = -1;
    let last = -1;
    for (let x = 0; x < width; x += 1) {
      if (!isWhite((y * width + x) * 4)) {
        if (first < 0) first = x;
        last = x;
      }
    }
    rowRanges.push(first < 0 ? null : [first, last]);
  }
  const copy = (to, from) => { data[to] = data[from]; data[to + 1] = data[from + 1]; data[to + 2] = data[from + 2]; };
  for (let y = 0; y < height; y += 1) {
    let sourceRow = y;
    for (let d = 1; !rowRanges[sourceRow] && d < height; d += 1) {
      sourceRow = rowRanges[y + d] ? y + d : rowRanges[y - d] ? y - d : sourceRow;
    }
    const range = rowRanges[sourceRow];
    if (!range) continue;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (sourceRow === y && x >= range[0] && x <= range[1] && !isWhite(i)) continue;
      const sx = Math.min(Math.max(x, range[0] + 2), range[1] - 2);
      if (sourceRow === y && !isWhite(i)) continue;
      copy(i, (sourceRow * width + sx) * 4);
    }
  }
  return jpeg.encode(image, 90).data;
}
const CLEAN_TEXTURES = ["MADTOP.JPG"];

const doc = new Document();
doc.createBuffer();
const clearcoat = doc.createExtension(KHRMaterialsClearcoat);
const scene = doc.createScene("violin");
const textures = new Map();
const materials = new Map();

async function textureFor(name) {
  if (!textures.has(name)) {
    let image = await readFile(join(sourceDir, name));
    if (CLEAN_TEXTURES.includes(name)) image = fillWhiteBackground(image);
    textures.set(name, doc.createTexture(name).setImage(new Uint8Array(image)).setMimeType("image/jpeg"));
  }
  return textures.get(name);
}

async function materialFor(name) {
  if (materials.has(name)) return materials.get(name);
  const spec = MATERIALS[name] ?? { color: [0.5, 0.5, 0.5], roughness: 0.5 };
  const material = doc.createMaterial(name)
    .setDoubleSided(true)
    .setRoughnessFactor(spec.roughness)
    .setMetallicFactor(spec.metallic ?? 0);
  if (spec.texture) material.setBaseColorTexture(await textureFor(spec.texture));
  if (spec.color) material.setBaseColorFactor([...spec.color, 1]);
  if (spec.coat) material.setExtension("KHR_materials_clearcoat", clearcoat.createClearcoat().setClearcoatFactor(0.8).setClearcoatRoughnessFactor(0.3));
  materials.set(name, material);
  return material;
}

// Curved parts get smooth shading, so the varnish shine glides instead of flashing on single faces.
const SMOOTH_PARTS = ["top", "back", "ribs", "neck", "pegbox", "scroll", "pegs", "chinrest", "stick"];

for (const id of PART_IDS) {
  const list = parts.get(id);
  if (!list) continue;
  const mesh = doc.createMesh(id);
  const byMaterial = new Map();
  list.forEach((t) => byMaterial.set(t.material, [...(byMaterial.get(t.material) ?? []), t]));
  for (const [materialName, triangles] of byMaterial) {
    const spec = MATERIALS[materialName] ?? {};
    const withUv = Boolean(spec.texture) && triangles.every((t) => t.uvs);
    const positions = [];
    const uvs = [];
    triangles.forEach((t) => t.points.forEach((p, k) => {
      positions.push((p.x - center.x) * scale, (p.y - center.y) * scale, (p.z - center.z) * scale);
      if (withUv) uvs.push(t.uvs[k].x, 1 - t.uvs[k].y); // glTF images are not flipped like three's
    }));
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (withUv) geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    if (SMOOTH_PARTS.includes(id)) geometry = mergeVertices(geometry, 1e-4);
    geometry.computeVertexNormals();
    const primitive = doc.createPrimitive()
      .setMaterial(await materialFor(materialName))
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(geometry.attributes.position.array)))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(geometry.attributes.normal.array)));
    if (withUv) primitive.setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(geometry.attributes.uv.array)));
    if (geometry.index) primitive.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(geometry.index.array)));
    mesh.addPrimitive(primitive);
  }
  scene.addChild(doc.createNode(id).setMesh(mesh));
}

await doc.transform(weld(), dedup(), prune());
await mkdir(dirname(output), { recursive: true });
await new NodeIO().registerExtensions([KHRMaterialsClearcoat]).write(output, doc);

const size = all.getSize(new THREE.Vector3()).multiplyScalar(scale);
console.log(`Wrote ${output}`);
console.log(`Scene size ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} cm, parts ${[...parts.keys()].length}`);
