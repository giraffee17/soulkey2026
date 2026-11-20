// Soul Key API Worker. Owns every server decision and, from week 2, every Cloudflare
// binding (D1, R2, KV, Durable Object). The Pages site only ever calls this Worker.
import { allowedOrigin, preflight, withCors } from "./cors.js";

const json = (data, status = 200) => Response.json(data, { status });

const routes = {
  "GET /api/health": () => json({ ok: true, service: "soulkey-api" }),
};

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") return preflight(origin);

    const { pathname } = new URL(request.url);
    const handler = routes[`${request.method} ${pathname}`];
    const response = handler ? await handler(request, env) : json({ error: "Not found" }, 404);
    return withCors(response, origin);
  },
};
