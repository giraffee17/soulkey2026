// Copies the Three.js files the site needs from node_modules into
// frontend-pages/public/vendor/three, so the browser can load them through
// the import map without a bundler. The vendor folder is not committed.
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "three");
const to = join(root, "frontend-pages", "public", "vendor", "three");

const files = [
  ["build/three.module.js", "three.module.js"],
  ["build/three.core.js", "three.core.js"],
  ["examples/jsm/controls/OrbitControls.js", "addons/controls/OrbitControls.js"],
  ["examples/jsm/loaders/GLTFLoader.js", "addons/loaders/GLTFLoader.js"],
  ["examples/jsm/utils/BufferGeometryUtils.js", "addons/utils/BufferGeometryUtils.js"],
  ["examples/jsm/utils/SkeletonUtils.js", "addons/utils/SkeletonUtils.js"],
];

for (const [source, target] of files) {
  const destination = join(to, target);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(from, source), destination);
}

console.log(`Vendored ${files.length} Three.js files into ${to}`);
