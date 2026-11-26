// Soul Key API Worker. Owns every server decision and, from week 2, every Cloudflare
// binding (D1, R2, KV, Durable Object). The Pages site only ever calls this Worker.
import { allowedOrigin, preflight, withCors } from "./cors.js";
import { getPart } from "./parts.js";

const json = (data, status = 200) => Response.json(data, { status });

// Each route is a method, a path pattern and a handler. Named groups become params.
const routes = [
  { method: "GET", pattern: /^\/api\/health$/, handler: () => json({ ok: true, service: "soulkey-api" }) },
  { method: "GET", pattern: /^\/api\/parts\/(?<id>[a-z-]+)$/, handler: (request, env, params) => getPart(params.id, env) },
];

function match(method, pathname) {
  for (const route of routes) {
    const found = route.method === method && route.pattern.exec(pathname);
    if (found) return { handler: route.handler, params: found.groups ?? {} };
  }
  return null;
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") return preflight(origin);

    const { pathname } = new URL(request.url);
    const route = match(request.method, pathname);
    let response;
    try {
      response = route ? await route.handler(request, env, route.params) : json({ error: "Not found" }, 404);
    } catch (error) {
      // Still answer with CORS, so the site can show its own error message instead of a CORS failure.
      console.error(error);
      response = json({ error: "Server error" }, 500);
    }
    return withCors(response, origin);
  },
};
