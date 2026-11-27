// GET /api/parts: the catalog (groups and parts with names), from content/parts.json.
// GET /api/parts/:id: one part's info table texts (EN and MN) and its sources, read from D1.
// A field that is NULL in the database comes back as null; the site decides what to show.
import { CATALOG, PART_IDS } from "./part-ids.js";

// Names and groups change only with a deploy, so browsers may reuse them for a while.
export function getCatalog() {
  return Response.json(CATALOG, { headers: { "Cache-Control": "public, max-age=300" } });
}

const LANGS = ["en", "mn"];

const emptyText = () => ({ whatItDoes: null, madeOf: null, whereItSits: null, funFact: null });

const toText = (row) => ({
  whatItDoes: row.what_it_does ?? null,
  madeOf: row.made_of ?? null,
  whereItSits: row.where_it_sits ?? null,
  funFact: row.fun_fact ?? null,
});

export async function getPart(id, env) {
  if (!PART_IDS.includes(id)) return Response.json({ error: "Unknown part" }, { status: 404 });

  const [texts, sources] = await env.DB.batch([
    env.DB.prepare("SELECT lang, what_it_does, made_of, where_it_sits, fun_fact FROM part_texts WHERE part_id = ?").bind(id),
    env.DB.prepare("SELECT title, url FROM part_sources WHERE part_id = ? ORDER BY position").bind(id),
  ]);

  const body = { id, texts: Object.fromEntries(LANGS.map((lang) => [lang, emptyText()])), sources: [] };
  for (const row of texts.results) {
    if (LANGS.includes(row.lang)) body.texts[row.lang] = toText(row);
  }
  body.sources = sources.results.map(({ title, url }) => ({ title, url }));

  // Texts change only when the seed is loaded again, so browsers may reuse them for a while.
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=300" } });
}
