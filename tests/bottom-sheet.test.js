import { test } from "node:test";
import assert from "node:assert/strict";
import { createBottomSheet, contentIsInert } from "../frontend-pages/public/js/bottom-sheet.js";

// Tiny stand-ins for the DOM pieces the sheet touches (node has EventTarget, not elements).
class FakeElement extends EventTarget {
  dataset = {};
  attributes = {};
  textContent = "";
  inert = false;
  focused = false;
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() { this.focused = true; }
}

class FakeMedia extends EventTarget {
  constructor(matches) { super(); this.matches = matches; }
  flip(matches) { this.matches = matches; this.dispatchEvent(new Event("change")); }
}

const keydown = (key) => Object.assign(new Event("keydown"), { key });

function setup(isSheet = true) {
  const parts = { sheet: new FakeElement(), handle: new FakeElement(), content: [new FakeElement(), new FakeElement()] };
  parts.sheet.dataset.open = "false";
  const media = new FakeMedia(isSheet);
  const controller = createBottomSheet({ ...parts, media, labels: { open: "Show parts", close: "Hide parts" } });
  return { ...parts, media, controller };
}

test("sheet content is hidden from keyboard and screen readers only while the sheet is closed", () => {
  assert.equal(contentIsInert({ isSheet: true, open: false }), true);
  assert.equal(contentIsInert({ isSheet: true, open: true }), false);
  assert.equal(contentIsInert({ isSheet: false, open: false }), false);
});

test("opening the sheet with its handle makes the content reachable again", () => {
  const { handle, content, controller: sheet } = setup();
  assert.ok(content.every((element) => element.inert));
  handle.dispatchEvent(new Event("click"));
  assert.equal(sheet.isOpen(), true);
  assert.equal(handle.attributes["aria-expanded"], "true");
  assert.equal(handle.textContent, "Hide parts");
  assert.ok(content.every((element) => !element.inert));
});

test("Escape closes an open sheet and puts focus back on the handle", () => {
  const { sheet: sheetElement, handle, content, controller: sheet } = setup();
  sheet.setOpen(true);
  sheetElement.dispatchEvent(keydown("Escape"));
  assert.equal(sheet.isOpen(), false);
  assert.equal(sheetElement.dataset.open, "false");
  assert.equal(handle.focused, true);
  assert.ok(content.every((element) => element.inert));
});

test("on a wide screen the side panel is never inert, and Escape leaves it alone", () => {
  const { sheet: sheetElement, handle, content, media, controller: sheet } = setup(false);
  assert.ok(content.every((element) => !element.inert));
  sheet.setOpen(true);
  sheetElement.dispatchEvent(keydown("Escape"));
  assert.equal(sheet.isOpen(), true);
  assert.equal(handle.focused, false);
  media.flip(true);
  sheet.setOpen(false);
  assert.ok(content.every((element) => element.inert));
  media.flip(false);
  assert.ok(content.every((element) => !element.inert));
});

test("changing language relabels the handle, and dispose stops listening", () => {
  const { handle, controller: sheet } = setup();
  sheet.setLabels({ open: "Хэсгүүдийг харах", close: "Хэсгүүдийг хаах" });
  assert.equal(handle.textContent, "Хэсгүүдийг харах");
  sheet.dispose();
  handle.dispatchEvent(new Event("click"));
  assert.equal(sheet.isOpen(), false);
});
