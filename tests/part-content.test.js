// Guards the part texts content (api-worker/seed/part-texts.json) and the SQL made from it.
// PLAN.md, Source rules: every fact keeps its link and is checked against a second source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import catalog from "../api-worker/content/parts.json" with { type: "json" };

const PART_IDS = catalog.parts.map((part) => part.id);
import { seedSql } from "../scripts/seed-sql.mjs";

const content = JSON.parse(await readFile(new URL("../api-worker/seed/part-texts.json", import.meta.url), "utf8"));
const migration = await readFile(new URL("../api-worker/migrations/0001_part_texts.sql", import.meta.url), "utf8");

const FIELDS = { whatItDoes: 220, madeOf: 80, whereItSits: 160, funFact: 200 };
const filled = (text) => Object.keys(FIELDS).some((key) => text?.[key]);

test("the content lists exactly the plan's part ids, in order", () => {
  assert.deepEqual(content.parts.map((part) => part.id), PART_IDS);
});

test("every part has both languages with the four fields, and nothing else", () => {
  for (const part of content.parts) {
    for (const lang of ["en", "mn"]) {
      assert.deepEqual(Object.keys(part[lang]).sort(), Object.keys(FIELDS).sort(), `${part.id} ${lang}`);
    }
    assert.ok(Array.isArray(part.sources), `${part.id} sources`);
  }
});

test("texts stay short enough for the panel", () => {
  for (const part of content.parts) {
    for (const lang of ["en", "mn"]) {
      for (const [key, max] of Object.entries(FIELDS)) {
        const value = part[lang][key];
        if (value === null) continue;
        assert.equal(typeof value, "string", `${part.id} ${lang} ${key}`);
        assert.ok(value.trim().length > 0 && value.length <= max, `${part.id} ${lang} ${key} is ${value.length} characters (max ${max})`);
      }
    }
  }
});

test("a part with any text has at least two https sources from two different sites", () => {
  for (const part of content.parts) {
    for (const source of part.sources) {
      assert.ok(source.title?.trim(), `${part.id}: a source has no title`);
      assert.equal(new URL(source.url).protocol, "https:", `${part.id}: ${source.url}`);
    }
    if (!filled(part.en) && !filled(part.mn)) continue;
    const hosts = new Set(part.sources.map((source) => new URL(source.url).hostname.replace(/^www\./, "")));
    assert.ok(hosts.size >= 2, `${part.id} needs sources from two different sites`);
  }
});

test("the seed SQL loads into the migration's tables and reads back", async (t) => {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import("node:sqlite"));
  } catch {
    t.skip("node:sqlite is not available in this Node version");
    return;
  }
  const sample = {
    parts: [
      {
        id: "bridge",
        en: { whatItDoes: "It's a part's job", madeOf: "Maple", whereItSits: null, funFact: null },
        mn: { whatItDoes: null, madeOf: null, whereItSits: null, funFact: null },
        sources: [{ title: "A 'quoted' title", url: "https://example.org/a" }, { title: "B", url: "https://example.net/b" }],
      },
    ],
  };
  const db = new DatabaseSync(":memory:");
  db.exec(migration);
  db.exec(seedSql(sample));
  db.exec(seedSql(sample)); // running the seed twice must not fail or duplicate
  const row = db.prepare("SELECT * FROM part_texts WHERE part_id = 'bridge' AND lang = 'en'").get();
  assert.equal(row.what_it_does, "It's a part's job");
  assert.equal(row.where_it_sits, null);
  const sources = db.prepare("SELECT title FROM part_sources ORDER BY position").all();
  assert.deepEqual(sources.map((source) => source.title), ["A 'quoted' title", "B"]);

  db.exec(seedSql(content)); // the real content loads too
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM part_texts").get().n, PART_IDS.length * 2);
  db.close();
});
