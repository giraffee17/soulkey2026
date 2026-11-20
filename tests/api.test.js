import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../api-worker/src/index.js";

const env = { ALLOWED_ORIGINS: "http://127.0.0.1:8788" };

test("health answers with CORS for the allowed origin", async () => {
  const response = await worker.fetch(new Request("http://api/api/health", { headers: { Origin: "http://127.0.0.1:8788" } }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:8788");
  assert.deepEqual(await response.json(), { ok: true, service: "soulkey-api" });
});

test("an unknown origin gets no CORS header", async () => {
  const response = await worker.fetch(new Request("http://api/api/health", { headers: { Origin: "https://evil.example" } }), env);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("unknown routes return 404", async () => {
  const response = await worker.fetch(new Request("http://api/api/nope"), env);
  assert.equal(response.status, 404);
});
