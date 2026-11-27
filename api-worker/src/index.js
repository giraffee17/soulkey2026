// Soul Key API Worker. Owns every server decision and, from week 2, every Cloudflare
// binding (D1, R2, KV, Durable Object). The Pages site only ever calls this Worker,
// and everything the site shows about the violin comes from here as JSON.
import { allowedOrigin, preflight, withCors } from "./cors.js";
import catalog from "../content/parts.json" with { type: "json" };

const json = (data, { status = 200, maxAge = 0 } = {}) => Response.json(data, {
  status,
  headers: maxAge ? { "Cache-Control": `public, max-age=${maxAge}` } : {},
});

const routes = {
  "GET /api/health": () => json({ ok: true, service: "soulkey-api" }),
  // Groups and parts with names and info in English and Mongolian. Browsers may reuse it for 5 minutes.
  "GET /api/parts": () => json(catalog, { maxAge: 300 }),
};

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") return preflight(origin);

    const { pathname } = new URL(request.url);
    const handler = routes[`${request.method} ${pathname}`];
    const response = handler ? await handler(request, env) : json({ error: "Not found" }, { status: 404 });
    return withCors(response, origin);
  },
};
