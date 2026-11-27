# Soul Key (Соль түлхүүр): web project plan

This file is the source of truth for every scheduled Claude run. Read it fully before changing anything.
The same plan lives in the Claude project doc "Soul Key (Соль түлхүүр): web project plan".

## Overview

Soul Key is an interactive 3D violin website for beginners: a violin on the left you can rotate, zoom, pluck and bow, and an elegant panel on the right that explains every part.

* **Name:** Soul Key (Соль түлхүүр). It sounds like both soul and sol. Sol is G, the violin's lowest string, and the treble clef is the G clef. The site is the key that opens the violin.
* **Logo:** a treble clef shaped like a key.
* **Audience:** beginners and people who love classical music.
* **Business goal:** sell it later to classical music lovers. This semester it is the web class final project.
* **Feeling:** dressing up to see Tchaikovsky at the theatre. Woody, rich, sparkly and elegant, with a 2000s glossy classical mood.

## Scope this semester

Demo due mid December 2026 (exact date to confirm).

In scope:

* 3D violin and bow: rotate, zoom, click any part to learn about it
* Parts that separate and reassemble (only if the bought model has ready parts; until then a stand-in model with the same part ids)
* Pluck and bow the 4 open strings only: G, D, A, E
* Concert hall echo on every sound
* Curtain and scroll intro
* English and Mongolian
* Works on desktop and phone

Out of scope for now: finger notes, scales, the 7 notes lesson, accounts, payments, background music that plays by itself.

## Experience flow

Intro, driven by scroll (about two screens):

1. Closed burgundy velvet curtain, a faint sepia sheet music layer, the Soul Key title in the script font.
2. Scrolling opens the curtain with a silky ripple.
3. Camera is close on the violin head (scroll and pegs) from the side, lit by the spotlight.
4. Scrolling turns the head to face forward, zooms out and rotates the violin.
5. The violin settles on the left and the panel slides in on the right: Explore mode.

Rules: a "Skip intro" button is always visible. The full intro plays on the first visit only. With reduced motion, go straight to Explore.

Three modes (tabs at the top), so a drag never means two things:

| Mode | Drag does | Click or tap does |
| --- | --- | --- |
| Explore | Rotates the violin | Selects a part and opens its info |
| Assemble | Rotates the floating parts | Selects a floating part and opens its info |
| Play | Bows the string under the pointer | Plucks a string |

In Play, the camera locks to a player's view of the strings.

## Interaction rules

| Action | Desktop | Phone | Keyboard |
| --- | --- | --- | --- |
| Rotate | Drag | One finger drag | Arrow keys |
| Zoom | Scroll wheel | Pinch | + and - |
| Select a part | Click the part or the parts list | Tap the part or the parts list | Tab through the parts list, Enter |
| Pluck (Play) | Click a string | Tap a string | 1 to 4 for G, D, A, E |
| Bow (Play) | Drag across a string near the bridge | Swipe across a string | Hold Shift + 1 to 4 |

* Selecting a part: the camera flies to it, the part glows gold, the panel opens.
* Pluck and bow: the string vibrates, the note name shows, a tiny shimmer or rosin dust appears.
* Desktop layout: violin left 60%, panel right 40%. Phone: violin fills the screen, panel slides up as a bottom sheet.
* Parts list groups: Body, Neck and scroll, Fittings, Inside, Bow.

## Visual style

| Token | Hex | Used for |
| --- | --- | --- |
| `--color-stage` | #0B0907 | Page background |
| `--color-panel` | #17110D | Info panel background |
| `--color-parchment` | #E8DCC0 | Main text, titles |
| `--color-parchment-muted` | #CDBF9F | Body text in the panel |
| `--color-gold` | #C9A54C | Labels, hairlines, selected glow, focus ring |
| `--color-wood` | #7A3E1B | Stand-in violin wood |
| `--color-velvet` | #5C1420 | Curtain, active mode tab, thin selection line |

Fonts: fancy titles in English only use Great Vibes. Everything else, including all Mongolian text and Mongolian titles, uses Arial, Helvetica, sans-serif.

Light and sparkle: one spotlight from above with a soft cone; gold dust drifting mostly inside the beam; glossy strings and varnish when rotating; shimmer on pluck; rosin dust following the bow; sparkle burst when assembly completes. All decorative effects turn off with reduced motion.

Elegant info table: no boxes or grid lines; small gold labels in spaced capitals; cream Arial values; thin gold hairlines that fade at both ends; rows fade in one after another; small gold flourishes at the panel corners.

## Part content

One id per part, shared by the 3D model, the database and the URL (`#/part/bridge`).

| Group | Parts (id) |
| --- | --- |
| Body | top, back, ribs, f-holes, purfling, end-button |
| Neck and scroll | neck, scroll, pegbox, pegs, nut, fingerboard |
| Fittings | bridge, tailpiece, fine-tuners, chinrest, saddle, string-g, string-d, string-a, string-e |
| Inside | soundpost, bass-bar |
| Bow | stick, hair, frog, screw, tip |

Table rows for every part: name (EN and MN), what it does, made of, where it sits, fun fact (hidden if none), sources (folded).

Source rules: official sources only, every fact double checked against a second source, every fact keeps its link. Claude writes Mongolian from English; Maralgua checks violin terms. Never invent Mongolian violin terms: leave them empty until Maralgua fills them.

## Tech stack by lecture

| Lecture | Job in Soul Key |
| --- | --- |
| W1 UI/UX | Goal first, most important facts first, parts list for recognition over recall |
| W2 CSS architecture | `@layer`, semantic and component tokens, container queries, visible focus states |
| W3 Rendering and animation | Only transform and opacity for UI motion, scroll timeline intro, View Transitions, reduced motion, DevTools traces as proof |
| W4 Web Components | `sk-*` custom elements: attributes in, events out, cleanup in `disconnectedCallback` |
| W5 Tiny framework | ES modules, no bundler, signals and store, hash router |
| W6 Runtime and state | One status value, ignore stale results, AbortController cleanup, size limited cache |
| W7 Web Workers | Module Worker builds the concert hall echo at load time |
| W8 WebAssembly | Echo builder in Rust, compiled with wasm-pack, runs in that Worker |
| W9 Cloudflare | Pages site, Worker API, D1 part texts, R2 model and sounds, KV settings, Durable Object live audience counter |

Three.js is loaded through an import map from `public/vendor/three/` (copied from npm by `npm run vendor`), so there is no bundler.

## Architecture

```
soulkey2026/
├─ frontend-pages/
│  ├─ public/
│  │  ├─ index.html          import map for Three.js
│  │  ├─ css/                tokens, base, components (@layer)
│  │  ├─ js/
│  │  │  ├─ framework/       signals, store, router
│  │  │  ├─ data/            part ids, groups, names
│  │  │  ├─ components/      sk-stage, sk-panel, sk-parts-list, sk-mode-tabs, sk-lang-switch
│  │  │  ├─ scene/           violin, camera, lights
│  │  │  ├─ audio/           pluck, bow, echo (week 2)
│  │  │  └─ workers/         echo-worker.js (week 2)
│  │  └─ vendor/three/       generated, not committed
│  └─ package.json
├─ api-worker/
│  ├─ src/                   routes, CORS, audience Durable Object
│  ├─ migrations/            D1 tables (week 2)
│  └─ wrangler.jsonc
├─ echo-rs/                  Rust source for the hall echo (week 2)
├─ scripts/                  dev-all, vendor, check
├─ tests/
├─ CHANGELOG-AI.md           log of every Claude run
└─ package.json              npm workspaces
```

The browser only talks to the API Worker; the Worker alone reads D1, R2, KV and the Durable Object.

## Performance, memory and accessibility

* One particle system with a fixed, reused set of particles; nothing created per frame.
* Render only when something changes; pause when the tab is hidden.
* Pixel ratio capped at 2, lower on phones.
* Curtain ripple is a shader, not a cloth simulation.
* Dispose Three.js objects when a component is removed.
* Every 3D action has a keyboard and parts list path. Visible gold focus ring. Reduced motion skips the intro and decoration.

Evidence for the report: frame gaps during the intro, memory after opening and closing parts 20 times, main thread time with and without the echo Worker, echo build time JS versus WebAssembly (5 runs, median), layout shift on first load.

## Schedule

1. Foundation (Nov 19 to Nov 25): monorepo, Pages and API Worker running, tokens and layers, stand-in violin, Explore mode with rotate, zoom and click.
2. Content and sound (Nov 26 to Dec 2): D1 part texts EN and MN, elegant table, parts list, router, Play mode pluck and bow, sounds in R2, echo Worker with Rust to WebAssembly.
3. Intro and effects (Dec 3 to Dec 9): curtain and scroll intro, Assemble mode, spotlight, dust, gloss, rosin, KV settings, live audience counter. Model bought by Dec 3.
4. Model, proof, deploy (Dec 10 to Dec 14): swap in the bought model, collect evidence, accessibility pass, deploy, report. Demo Dec 15 (to confirm).

## Rules for scheduled Claude runs

1. Read this plan first. If a change goes against it, stop and write the question in the pull request instead of guessing.
2. One focus per run: one schedule item, or one bug, finished and checked. Don't mix unrelated changes.
3. Change only what the task needs. Don't add features, labels or content beyond the plan, and don't remove anything else.
4. Keep the folder structure, part ids and tokens exactly as written here.
5. Clean, reusable code: small modules, one reason to change per file.
6. Run `npm run check` and `npm test` before finishing.
7. Add an entry to `CHANGELOG-AI.md`: date, branch, what changed, why, which files.
8. Never commit secrets.
9. Every run works on its own branch `claude/daily-YYYY-MM-DD` and opens a pull request into `main`. Never push to `main`, never merge, never force push.
10. If 3 or more Claude pull requests are still open, start nothing new: fix problems on those branches, then stop.
11. Leave decisions that belong to Maralgua (Mongolian violin terms, buying the model, deploying, the deadline) as questions in the pull request.

## Current 3D model

The site uses a free model Maralgua provided (`VIOLIN_L.3DS`), converted to `frontend-pages/public/models/violin.glb` by `scripts/model/convert-free-violin.mjs`. It has every part except the f-holes and purfling (painted on the top, so they highlight the top). Nut, fine tuners, soundpost and bass bar were added as simple shapes. The stand-in violin is the fallback if the model fails to load.

## Open decisions

* Source and license of the free violin model (needed before selling or crediting)
* Buy a better 3D model later?
* Exact deadline date in December?
* Written final project rubric? More lectures coming?
* Tchaikovsky edition for the sheet music texture
* Mongolian violin terms for each part (Maralgua)
* Check the name Soul Key and its web address are free
