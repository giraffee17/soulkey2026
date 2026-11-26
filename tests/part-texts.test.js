import { test } from "node:test";
import assert from "node:assert/strict";
import { createPartTexts, pickText } from "../frontend-pages/public/js/data/part-texts.js";
import { apiBase, LOCAL_API_BASE } from "../frontend-pages/public/js/data/api.js";

// A fake fetch that records every URL and answers with the part id.
function fakeFetch({ status = 200 } = {}) {
  const calls = [];
  const fetchFn = async (url, { signal } = {}) => {
    calls.push(url);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const id = url.split("/").pop();
    return { ok: status < 400, status, json: async () => ({ id }) };
  };
  return { fetchFn, calls };
}

test("a cached part is served without a second request", async () => {
  const { fetchFn, calls } = fakeFetch();
  const texts = createPartTexts({ fetchFn, base: "http://api" });
  await texts.load("bridge");
  assert.deepEqual(await texts.load("bridge"), { id: "bridge" });
  assert.deepEqual(calls, ["http://api/api/parts/bridge"]);
});

test("the cache keeps only the most recently used parts", async () => {
  const { fetchFn, calls } = fakeFetch();
  const texts = createPartTexts({ fetchFn, base: "", limit: 2 });
  await texts.load("top");
  await texts.load("back");
  await texts.load("top"); // top is now the most recent
  await texts.load("ribs"); // back leaves
  assert.equal(texts.size(), 2);
  await texts.load("top");
  await texts.load("back");
  assert.deepEqual(calls, ["/api/parts/top", "/api/parts/back", "/api/parts/ribs", "/api/parts/back"]);
});

test("a failed request is not cached", async () => {
  let status = 500;
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    return { ok: status < 400, status, json: async () => ({ ok: true }) };
  };
  const texts = createPartTexts({ fetchFn, base: "" });
  await assert.rejects(texts.load("nut"), /HTTP 500/);
  status = 200;
  assert.deepEqual(await texts.load("nut"), { ok: true });
  assert.equal(calls.length, 2);
});

test("an aborted request rejects with the AbortError and caches nothing", async () => {
  const { fetchFn } = fakeFetch();
  const texts = createPartTexts({ fetchFn, base: "" });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(texts.load("pegs", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(texts.size(), 0);
});

test("a missing Mongolian text falls back to English and says so", () => {
  const texts = { en: { madeOf: "Maple", funFact: null }, mn: { madeOf: null, funFact: null } };
  assert.deepEqual(pickText(texts, "mn", "madeOf"), { text: "Maple", lang: "en" });
  assert.deepEqual(pickText({ ...texts, mn: { madeOf: "Агч" } }, "mn", "madeOf"), { text: "Агч", lang: "mn" });
  assert.equal(pickText(texts, "mn", "funFact"), null);
  assert.equal(pickText(null, "en", "madeOf"), null);
});

test("the site calls the local Worker when it runs on this computer", () => {
  assert.equal(apiBase("127.0.0.1"), LOCAL_API_BASE);
  assert.equal(apiBase("localhost"), LOCAL_API_BASE);
});
