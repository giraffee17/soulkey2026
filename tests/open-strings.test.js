import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../api-worker/src/index.js";
import openStrings from "../api-worker/content/open-strings.json" with { type: "json" };
import catalog from "../api-worker/content/parts.json" with { type: "json" };
import { createOpenStrings, fetchOpenStrings } from "../frontend-pages/public/js/data/open-strings.js";

const origin = "http://127.0.0.1:8788";
const askApi = (path) => worker.fetch(new Request(`http://api${path}`, { headers: { Origin: origin } }), { ALLOWED_ORIGINS: origin });

test("the API serves the open strings as JSON with CORS and a short cache", async () => {
  const response = await askApi("/api/strings");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type"), /application\/json/);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.match(response.headers.get("Cache-Control"), /max-age=300/);
  const strings = createOpenStrings(await response.json());
  assert.deepEqual(strings.map((string) => string.note), ["G", "D", "A", "E"]);
});

test("the open strings are the catalog's four string parts, lowest first (PLAN.md: G, D, A, E)", () => {
  const stringParts = catalog.parts.filter((part) => part.id.startsWith("string-")).map((part) => part.id);
  assert.deepEqual(openStrings.strings.map((string) => string.partId), stringParts);
  assert.deepEqual(openStrings.strings.map((string) => string.pitch), ["G3", "D4", "A4", "E5"]);
});

test("each string is a fifth above the one before, with A4 at 440 Hz", () => {
  const hz = openStrings.strings.map((string) => string.frequencyHz);
  assert.equal(hz[2], 440);
  for (let i = 1; i < hz.length; i += 1) {
    // An equal-tempered fifth is 2^(7/12), about 1.498.
    assert.ok(Math.abs(hz[i] / hz[i - 1] - 2 ** (7 / 12)) < 0.001, `${hz[i - 1]} to ${hz[i]} is not a fifth`);
  }
});

test("the string facts keep at least two https sources", () => {
  assert.ok(openStrings.sources.length >= 2);
  openStrings.sources.forEach((source) => {
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.title && source.supports);
  });
});

test("fetchOpenStrings goes through the API origin and reports server errors", async () => {
  const calls = [];
  const strings = await fetchOpenStrings("http://127.0.0.1:8787", {
    fetchImpl: async (url) => {
      calls.push(url);
      return askApi(new URL(url).pathname);
    },
  });
  assert.deepEqual(calls, ["http://127.0.0.1:8787/api/strings"]);
  assert.equal(strings[0].partId, "string-g");
  await assert.rejects(fetchOpenStrings("http://x", { fetchImpl: async () => new Response("down", { status: 503 }) }), /503/);
});

test("broken open strings fail with a clear message", () => {
  assert.throws(() => createOpenStrings({}), /missing/);
  assert.throws(() => createOpenStrings({ strings: [{ partId: "string-g", note: "G", frequencyHz: -1 }] }), /broken string: string-g/);
  assert.throws(() => createOpenStrings({ strings: [{ note: "G", frequencyHz: 196 }] }), /broken string/);
});
