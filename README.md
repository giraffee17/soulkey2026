# Soul Key

An interactive 3D violin for beginners. Rotate it, take it apart, pluck and bow the open strings, and learn what every part does, in English and Mongolian.

Web class final project, 2026. See [PLAN.md](PLAN.md) for the full plan and [CHANGELOG-AI.md](CHANGELOG-AI.md) for the AI use log.

## Run it on your computer

You need Node.js 22.13 or newer.

```
npm install
npm run dev
```

Then open http://127.0.0.1:8788. The API runs at http://127.0.0.1:8787 (try `/api/health`).

`npm install` also copies Three.js into `frontend-pages/public/vendor/three/` (the import map loads it from there, so there is no bundler).

## Check before every commit

```
npm run check
npm test
```

`check` guards the plan's rules: part ids, both languages, no raw colors outside `tokens.css`, no id selectors, motion only on transform and opacity, and cleanup in every component.

## Folders

| Folder | What lives there |
| --- | --- |
| `frontend-pages/public/` | The site Cloudflare Pages serves: HTML, CSS layers, JS modules |
| `frontend-pages/public/js/components/` | `sk-*` Web Components |
| `frontend-pages/public/js/framework/` | Signals, store, hash router |
| `frontend-pages/public/js/scene/` | Three.js scene and the stand-in violin |
| `frontend-pages/public/js/data/` | Part ids and interface text (EN and MN) |
| `api-worker/` | The Worker API (D1, R2, KV and Durable Object bindings arrive in later weeks) |
| `scripts/` | Dev launcher, Three.js vendoring, structure checks |
| `tests/` | Unit tests (`node --test`) |

## Deploy (needs a Cloudflare account)

```
npx wrangler login
npm run deploy:api
npm run deploy:pages
```

After the first deploy, add the Pages URL to `ALLOWED_ORIGINS` in `api-worker/wrangler.jsonc`.
