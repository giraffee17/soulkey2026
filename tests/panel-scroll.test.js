import { test } from "node:test";
import assert from "node:assert/strict";
import { createSignal } from "../frontend-pages/public/js/framework/signal.js";
import { keepPanelTopInView } from "../frontend-pages/public/js/panel-scroll.js";

test("picking a part while the panel is scrolled down brings its top back into view", () => {
  const [selected, setSelected] = createSignal(null);
  const box = { scrollTop: 0 };
  keepPanelTopInView({ box, selected });
  box.scrollTop = 420; // the visitor scrolled down to the parts list
  setSelected("bridge");
  assert.equal(box.scrollTop, 0);
});

test("clearing the selection also returns to the top, where the empty title is", () => {
  const [selected, setSelected] = createSignal("bridge");
  const box = { scrollTop: 0 };
  keepPanelTopInView({ box, selected });
  box.scrollTop = 300;
  setSelected(null);
  assert.equal(box.scrollTop, 0);
});

test("scrolling the panel alone is left alone while the selection stays the same", () => {
  const [selected, setSelected] = createSignal("bridge");
  const box = { scrollTop: 0 };
  keepPanelTopInView({ box, selected });
  box.scrollTop = 250;
  setSelected("bridge");
  assert.equal(box.scrollTop, 250);
});

test("after dispose, the panel no longer follows the selection", () => {
  const [selected, setSelected] = createSignal(null);
  const box = { scrollTop: 0 };
  const dispose = keepPanelTopInView({ box, selected });
  dispose();
  box.scrollTop = 200;
  setSelected("soundpost");
  assert.equal(box.scrollTop, 200);
});
