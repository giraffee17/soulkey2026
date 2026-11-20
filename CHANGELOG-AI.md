# AI use log

Every change made by Claude is logged here, newest first. This log is the AI use disclosure for the course report.
The ideas, design decisions and final review are Maralgua's.

| Date | Branch | What changed | Why | Files |
| --- | --- | --- | --- | --- |
| 2026-11-21 | claude/daily-2026-11-21 | Phone bottom sheet accessibility: while the sheet is closed, its panel and parts list are `inert`, so Tab and screen readers skip the 28 off-screen buttons; Escape closes an open sheet and returns focus to the handle; switching between phone and desktop width updates this live. Sheet logic moved out of `main.js` into its own small module with 5 unit tests. No visual change and no new interface text | Polish (week 1 items are all merged, main was healthy): on a 390px screen, Tab went from "Show parts" into hidden buttons below the screen (PLAN.md, Performance, memory and accessibility) | frontend-pages/public/js/bottom-sheet.js, frontend-pages/public/js/main.js, tests/bottom-sheet.test.js, CHANGELOG-AI.md |
| 2026-11-20 | claude/week1-foundation | Week 1 foundation: npm workspaces monorepo, Pages site with CSS layers and tokens, signals, store and hash router, five `sk-*` Web Components, stand-in 3D violin and bow with every planned part id, Explore mode (rotate, zoom, click, keyboard, camera flight, see-through top for inside parts), parts list, panel with the elegant table (content placeholders), EN and MN interface text (MN needs Maralgua's check, part names left empty for her), phone bottom sheet, API Worker with CORS and `/api/health`, structure checks and 10 unit tests | Schedule week 1 in PLAN.md | package.json, scripts/, frontend-pages/, api-worker/, tests/, README.md |
| 2026-11-20 | main | Added the project plan and this log | Give every Claude run one source of truth | PLAN.md, CHANGELOG-AI.md, README.md, .gitignore |
