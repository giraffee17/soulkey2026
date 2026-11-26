import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../api-worker/src/index.js";
import { PART_IDS as API_IDS } from "../api-worker/src/part-ids.js";
import { PART_IDS as SITE_IDS } from "../frontend-pages/public/js/data/parts.js";

// A tiny stand-in for the D1 binding: just enough of prepare/bind/batch for the route.
function fakeDb({ texts = [], sources = [], fail = false } = {}) {
  const statement = (sql) => ({
    sql,
    bind(...values) {
      return { sql, values, all: async () => ({ results: sql.includes("part_sources") ? sources : texts }) };
    },
  });
  return {
    prepare: statement,
    async batch(statements) {
      if (fail) throw new Error("D1 is down");
      return Promise.all(statements.map((s) => s.all()));
    },
  };
}

const origin = "http://127.0.0.1:8788";
const call = (path, db) =>
  worker.fetch(new Request(`http://api${path}`, { headers: { Origin: origin } }), { ALLOWED_ORIGINS: origin, DB: db });

test("the Worker's part ids match the site's part ids", () => {
  assert.deepEqual(API_IDS, SITE_IDS);
});

test("a part with texts returns both languages and its sources, with CORS", async () => {
  const db = fakeDb({
    texts: [{ lang: "en", what_it_does: "Holds the strings up.", made_of: "Maple", where_it_sits: null, fun_fact: null }],
    sources: [{ title: "Violin", url: "https://example.org/violin" }],
  });
  const response = await call("/api/parts/bridge", db);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.match(response.headers.get("Cache-Control"), /max-age=/);
  assert.deepEqual(await response.json(), {
    id: "bridge",
    texts: {
      en: { whatItDoes: "Holds the strings up.", madeOf: "Maple", whereItSits: null, funFact: null },
      mn: { whatItDoes: null, madeOf: null, whereItSits: null, funFact: null },
    },
    sources: [{ title: "Violin", url: "https://example.org/violin" }],
  });
});

test("a known part with no rows yet answers with empty texts", async () => {
  const body = await (await call("/api/parts/tip", fakeDb())).json();
  assert.equal(body.texts.en.whatItDoes, null);
  assert.deepEqual(body.sources, []);
});

test("an unknown part id is a 404 and never reaches the database", async () => {
  const response = await call("/api/parts/banjo", fakeDb({ fail: true }));
  assert.equal(response.status, 404);
});

test("a database failure is a 500 that still carries CORS", async () => {
  const response = await call("/api/parts/bridge", fakeDb({ fail: true }));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
});
