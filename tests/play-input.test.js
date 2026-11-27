import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceToSegment, nearestString } from "../frontend-pages/public/js/scene/string-hits.js";
import { BowGesture } from "../frontend-pages/public/js/scene/bow-gesture.js";
import { StringVibration } from "../frontend-pages/public/js/scene/string-vibration.js";
import { playKeyAction, isTypingTarget } from "../frontend-pages/public/js/components/play-keys.js";

const line = (id, x) => ({ id, a: { x, y: 400 }, b: { x, y: 0 } });
const lines = [line("string-g", 100), line("string-d", 150), line("string-a", 200), line("string-e", 250)];

test("distance to a string's line is measured to the nearest point on it", () => {
  assert.equal(distanceToSegment({ x: 110, y: 200 }, { x: 100, y: 400 }, { x: 100, y: 0 }), 10);
  assert.equal(distanceToSegment({ x: 100, y: 430 }, { x: 100, y: 400 }, { x: 100, y: 0 }), 30); // past the bridge end
});

test("the nearest string within reach is picked, and empty space picks nothing", () => {
  assert.equal(nearestString({ x: 158, y: 200 }, lines, 16), "string-d");
  assert.equal(nearestString({ x: 176, y: 200 }, lines, 30), "string-a");
  assert.equal(nearestString({ x: 175, y: 200 }, lines, 16), null);
  assert.equal(nearestString({ x: 175, y: 200 }, [], 16), null);
});

test("a faster drag bows louder, and a still bow fades", () => {
  const slow = new BowGesture();
  slow.start(0, 0, 0);
  for (let t = 16; t <= 160; t += 16) slow.move(t * 0.2, 0, t);
  const fast = new BowGesture();
  fast.start(0, 0, 0);
  for (let t = 16; t <= 160; t += 16) fast.move(t * 2, 0, t);
  assert.ok(slow.levelAt(160) > 0 && slow.levelAt(160) < fast.levelAt(160));
  assert.ok(fast.levelAt(160) <= 1);
  assert.ok(fast.levelAt(160 + 600) < fast.levelAt(160) * 0.1);
  assert.equal(new BowGesture().levelAt(0), 0);
});

test("a plucked string shivers, then rests exactly where it was", () => {
  const string = { position: { x: 2 } };
  const vibration = new StringVibration();
  vibration.pluck("string-g", string, 0);
  assert.equal(vibration.step(16), true);
  assert.notEqual(string.position.x, 2);
  assert.equal(vibration.step(5000), false);
  assert.equal(string.position.x, 2);
});

test("a bowed string keeps shivering until the bow leaves; reduced motion keeps it still", () => {
  const string = { position: { x: 0 } };
  const vibration = new StringVibration();
  vibration.bow("string-a", string, 0.8);
  assert.equal(vibration.step(10000), true);
  vibration.bow("string-a", string, 0);
  assert.equal(vibration.step(10016), false);
  assert.equal(string.position.x, 0);

  const still = new StringVibration({ enabled: false });
  still.pluck("string-a", string, 0);
  assert.equal(still.step(16), false);
  assert.equal(string.position.x, 0);
});

test("number keys 1 to 4 pluck the strings in order, Shift bows, other keys do nothing", () => {
  assert.deepEqual(playKeyAction({ code: "Digit1" }, 4), { index: 0, bow: false });
  assert.deepEqual(playKeyAction({ code: "Digit4", shiftKey: true }, 4), { index: 3, bow: true });
  assert.deepEqual(playKeyAction({ code: "Numpad2" }, 4), { index: 1, bow: false });
  assert.equal(playKeyAction({ code: "Digit5" }, 4), null);
  assert.equal(playKeyAction({ code: "Digit1", ctrlKey: true }, 4), null);
  assert.equal(playKeyAction({ code: "KeyA" }, 4), null);
  assert.equal(playKeyAction({ code: "Digit1" }, 0), null);
});

test("keys typed into text fields are never notes", () => {
  const inside = (selectorMatches) => ({ closest: () => (selectorMatches ? {} : null) });
  assert.equal(isTypingTarget(inside(true)), true);
  assert.equal(isTypingTarget(inside(false)), false);
  assert.equal(isTypingTarget(null), false);
});
