import { test } from "node:test";
import assert from "node:assert/strict";
import { createSignal, effect } from "../frontend-pages/public/js/framework/signal.js";
import { parseHash, hashFor } from "../frontend-pages/public/js/framework/router.js";

test("an effect re-runs only when a signal it reads changes", () => {
  const [count, setCount] = createSignal(0);
  const [other, setOther] = createSignal("a");
  const seen = [];
  effect(() => seen.push(count()));
  setCount(1);
  setOther("b");
  setCount(1);
  assert.deepEqual(seen, [0, 1]);
  assert.equal(other(), "b");
});

test("a disposed effect stops running", () => {
  const [value, setValue] = createSignal(0);
  let runs = 0;
  const dispose = effect(() => { value(); runs += 1; });
  dispose();
  setValue(5);
  assert.equal(runs, 1);
});

test("the router reads and writes part hashes", () => {
  assert.equal(parseHash("#/part/bridge"), "bridge");
  assert.equal(parseHash("#/part/string-g"), "string-g");
  assert.equal(parseHash("#/"), null);
  assert.equal(parseHash("#/part/<script>"), null);
  assert.equal(hashFor("soundpost"), "#/part/soundpost");
  assert.equal(hashFor(null), "#/");
});
