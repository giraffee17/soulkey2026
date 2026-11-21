import { test } from "node:test";
import assert from "node:assert/strict";
import { nextTabIndex } from "../frontend-pages/public/js/components/tab-keys.js";

test("left and right arrows move to the next tab and wrap around the ends", () => {
  assert.equal(nextTabIndex("ArrowRight", 0, 3), 1);
  assert.equal(nextTabIndex("ArrowRight", 2, 3), 0);
  assert.equal(nextTabIndex("ArrowLeft", 1, 3), 0);
  assert.equal(nextTabIndex("ArrowLeft", 0, 3), 2);
});

test("Home and End jump to the first and last tab", () => {
  assert.equal(nextTabIndex("Home", 2, 3), 0);
  assert.equal(nextTabIndex("End", 0, 3), 2);
});

test("other keys, and focus outside the tabs, leave focus alone", () => {
  assert.equal(nextTabIndex("Enter", 0, 3), null);
  assert.equal(nextTabIndex("ArrowDown", 0, 3), null);
  assert.equal(nextTabIndex("ArrowRight", -1, 3), null);
  assert.equal(nextTabIndex("ArrowRight", 0, 0), null);
});
