// Structure checks that protect the plan's rules (PLAN.md). Run with `npm run check`.
// Every failure names the file and the rule, so a small fix never breaks the whole site.
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import catalog from "../api-worker/content/parts.json" with { type: "json" };
import { STRINGS } from "../frontend-pages/public/js/data/strings.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cssDir = join(root, "frontend-pages", "public", "css");
const jsDir = join(root, "frontend-pages", "public", "js");
const problems = [];
const fail = (file, rule) => problems.push(`${relative(root, file)}: ${rule}`);

async function filesIn(dir, extension) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
}

// Rule 1: the server's catalog has exactly the part ids in the plan, with names in both languages.
// (The info texts live in api-worker/seed/part-texts.json; tests/part-content.test.js checks them.)
const { parts: PARTS, groups: GROUPS } = catalog;
const PLAN_IDS = [
  "top", "back", "ribs", "f-holes", "purfling", "end-button",
  "neck", "scroll", "pegbox", "pegs", "nut", "fingerboard",
  "bridge", "tailpiece", "fine-tuners", "chinrest", "saddle", "string-g", "string-d", "string-a", "string-e",
  "soundpost", "bass-bar",
  "stick", "hair", "frog", "screw", "tip",
];
const partsFile = join(root, "api-worker", "content", "parts.json");
const ids = PARTS.map((part) => part.id);
if (JSON.stringify(ids) !== JSON.stringify(PLAN_IDS)) fail(partsFile, "part ids differ from PLAN.md");
if (new Set(ids).size !== ids.length) fail(partsFile, "duplicate part id");
const groupIds = GROUPS.map((group) => group.id);
PARTS.filter((part) => !groupIds.includes(part.group)).forEach((part) => fail(partsFile, `unknown group for ${part.id}`));
for (const item of [...GROUPS, ...PARTS]) {
  if (!item.name?.en || typeof item.name.mn !== "string") fail(partsFile, `${item.id}.name needs "en" and "mn"`);
}

// Rule 1b: part data lives on the server only, never hard-coded in the frontend.
for (const file of await filesIn(jsDir, ".js")) {
  const code = await readFile(file, "utf8");
  if (/"soundpost"|'soundpost'|"bass-bar"/.test(code) && !file.includes("violin-standin.js")) fail(file, "part data belongs in api-worker/content/parts.json");
}

// Rule 2: every interface string exists in both languages.
const stringsFile = join(jsDir, "data", "strings.js");
for (const key of Object.keys(STRINGS.en)) {
  if (!(key in STRINGS.mn)) fail(stringsFile, `missing Mongolian string "${key}"`);
}

// Rule 3: CSS follows the Week 2 architecture.
for (const file of await filesIn(cssDir, ".css")) {
  const css = (await readFile(file, "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
  const name = relative(cssDir, file);
  if (name !== "tokens.css" && /#[0-9a-fA-F]{3,8}\b/.test(css)) fail(file, "raw color value outside tokens.css");
  if (/(^|[\s,{])#[a-zA-Z][\w-]*\s*[{,]/m.test(css)) fail(file, "id selector (use a class)");
  const withoutReducedMotion = css.replace(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/g, "");
  if (/!important/.test(withoutReducedMotion)) fail(file, "!important outside the reduced motion block");
}

// Rule 4: UI motion uses transform and opacity, not layout properties (Week 3).
for (const file of await filesIn(cssDir, ".css")) {
  const css = await readFile(file, "utf8");
  for (const match of css.matchAll(/transition:\s*([^;]+);/g)) {
    if (/\b(width|height|top|left|right|bottom|margin|padding)\b/.test(match[1])) fail(file, `transition on a layout property: ${match[1].trim()}`);
  }
}

// Rule 5: components clean up what they start (Week 4 and Week 6).
for (const file of await filesIn(join(jsDir, "components"), ".js")) {
  const code = await readFile(file, "utf8");
  if (/addEventListener/.test(code) && !/disconnectedCallback/.test(code)) fail(file, "adds listeners but has no disconnectedCallback");
}

if (problems.length) {
  console.error(`Check failed (${problems.length}):\n${problems.map((problem) => `  ${problem}`).join("\n")}`);
  process.exit(1);
}
console.log("Check passed: part ids, strings, CSS architecture, motion and cleanup rules.");
