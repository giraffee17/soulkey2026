# Soul Key

An interactive 3D violin for beginners. Rotate it, take it apart, pluck and bow the open strings, and learn what every part does, in English and Mongolian.

Web class final project, 2026. See [PLAN.md](PLAN.md) for the full plan and [CHANGELOG-AI.md](CHANGELOG-AI.md) for the AI use log.

## Run it on your computer

You need Node.js 22.13 or newer.

```
npm install
npm run dev
```

Then open http://127.0.0.1:8788. The API runs at http://127.0.0.1:8787 (try `/api/health`, `/api/parts` and `/api/strings`).

`npm install` also copies Three.js into `frontend-pages/public/vendor/three/` (the import map loads it from there, so there is no bundler).

## Database (D1)

The panel's part texts live in a D1 database. Their source of truth is `api-worker/seed/part-texts.json` (English and Mongolian, with sources); the tables are in `api-worker/migrations/`.

`npm run dev` creates and fills a local copy every time it starts. After editing the JSON, run `npm run db:local` (or restart `npm run dev`) to load the change.

For the real Cloudflare database, after it is created (`npx wrangler d1 create soulkey-db`, then put its `database_id` in `api-worker/wrangler.jsonc`):

```
npm run db:migrate:remote
npm run db:seed:remote
```

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
| `frontend-pages/public/js/data/` | Interface text (EN and MN), the catalog, part texts and open strings loaders |
| `frontend-pages/public/js/audio/` | Play mode sound: pluck and bow voices (synthesized until recorded sounds arrive from R2) |
| `api-worker/content/parts.json` | The parts catalog: ids, groups and names (EN and MN). Served as JSON at `/api/parts` |
| `api-worker/content/open-strings.json` | The four open strings for Play mode: note, pitch in Hz and sources. Served at `/api/strings` |
| `api-worker/seed/` | Part texts (EN and MN, with sources), loaded into D1 and served at `/api/parts/:id` |
| `api-worker/` | The Worker API: D1 part texts now; R2, KV and Durable Object bindings arrive in later weeks |
| `scripts/` | Dev launcher, Three.js vendoring, local database setup and seeding, model converter, structure checks |
| `tests/` | Unit tests (`node --test`) |

## 3D model

The site loads `frontend-pages/public/models/violin.glb`. The rule for any model: every top-level node is named with a part id from `frontend-pages/public/js/data/parts.js`. Parts drawn on another part's texture point at that part (`PART_HOSTS` in `js/scene/violin-model.js`). If the model fails to load, the stand-in violin appears instead.

The current model is a free 3DS model, converted with:

```
node scripts/model/convert-free-violin.mjs <folder with VIOLIN_L.3DS and its JPGs>
```

The source files are not committed. A bought model can replace `violin.glb` as long as its nodes keep the part id names.

## Deploy (needs a Cloudflare account)

```
npx wrangler login
npm run deploy:api
npm run deploy:pages
```

After the first deploy:

1. Put the Worker's URL in `PRODUCTION_API` in `frontend-pages/public/js/config.js`.
2. Add the Pages URL to `ALLOWED_ORIGINS` in `api-worker/wrangler.jsonc`.
