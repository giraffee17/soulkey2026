import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../api-worker/src/index.js";
import { createCatalog, fetchCatalog, localText } from "../frontend-pages/public/js/data/catalog.js";

const env = { ALLOWED_ORIGINS: "http://127.0.0.1:8788" };
const askApi = (path) => worker.fetch(new Request(`http://api${path}`, { headers: { Origin: "http://127.0.0.1:8788" } }), env);

test("the API serves the parts catalog as JSON the site can read", async () => {
  const response = await askApi("/api/parts");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type"), /application\/json/);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:8788");
  assert.match(response.headers.get("Cache-Control"), /max-age=300/);
  const catalog = createCatalog(await response.json());
  assert.equal(catalog.ids.length, 28);
  assert.equal(catalog.findPart("bridge").group, "fittings");
  assert.equal(catalog.findGroup("inside").name.en, "Inside");
});

test("fetchCatalog goes through the API origin and reports server errors", async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    return askApi(new URL(url).pathname);
  };
  const catalog = await fetchCatalog("http://127.0.0.1:8787", { fetchImpl: fakeFetch });
  assert.deepEqual(calls, ["http://127.0.0.1:8787/api/parts"]);
  assert.ok(catalog.ids.includes("soundpost"));

  const failing = async () => new Response("down", { status: 503 });
  await assert.rejects(fetchCatalog("http://x", { fetchImpl: failing }), /503/);
});

test("a broken catalog fails with a clear message", () => {
  assert.throws(() => createCatalog({}), /groups or parts/);
  assert.throws(() => createCatalog({ groups: [{ id: "body" }], parts: [{ id: "top", group: "nope", name: { en: "Top" } }] }), /broken part: top/);
});

test("text falls back to English when the Mongolian is still empty", () => {
  assert.equal(localText({ en: "Bridge", mn: "" }, "mn"), "Bridge");
  assert.equal(localText({ en: "Bridge", mn: "Гүүр" }, "mn"), "Гүүр");
  assert.equal(localText(undefined, "en"), "");
});
