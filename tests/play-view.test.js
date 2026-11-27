import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStandinViolin } from "../frontend-pages/public/js/scene/violin-standin.js";
import { stringLines, playerView } from "../frontend-pages/public/js/scene/play-view.js";

const palette = { wood: "#7a3e1b", maple: "#a8662e", ebony: "#15100c", metal: "#b9b2a3", string: "#d8c9a3", hair: "#efe6d2", ivory: "#e9dfc8", highlight: "#c9a54c" };
const STRING_IDS = ["string-g", "string-d", "string-a", "string-e"];

function partsOf(violin) {
  return new Map(violin.children.map((child) => [child.userData.partId, child]));
}

test("each string's playing length is found between the bridge and the nut, G on the left", () => {
  const lines = stringLines(partsOf(buildStandinViolin(palette)), STRING_IDS);
  assert.deepEqual(lines.map((line) => line.id), STRING_IDS);
  lines.forEach((line) => assert.ok(line.nut.y > line.bridge.y, `${line.id} runs up to the scroll`));
  const xs = lines.map((line) => line.bridge.x);
  assert.deepEqual([...xs].sort((a, b) => a - b), xs);
});

test("the player's view looks up the strings from behind the bridge, and backs off on a narrow phone", () => {
  const lines = stringLines(partsOf(buildStandinViolin(palette)), STRING_IDS);
  const wide = playerView(lines, 1.3, 35);
  const narrow = playerView(lines, 0.5, 35);
  assert.ok(wide.position.y < wide.target.y, "the camera sits on the chinrest side");
  assert.ok(wide.position.z > wide.target.z, "the camera is above the top");
  assert.ok(narrow.position.distanceTo(narrow.target) > wide.position.distanceTo(wide.target));
  assert.equal(playerView([], 1, 35), null);
});

test("a model without a bridge or nut has no string lines, so Play never guesses", () => {
  const parts = partsOf(buildStandinViolin(palette));
  parts.delete("bridge");
  assert.deepEqual(stringLines(parts, STRING_IDS), []);
});
