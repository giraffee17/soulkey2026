// GET /api/strings: the four open strings Play mode can sound (PLAN.md: G, D, A, E only),
// from content/open-strings.json. Each string names its part id, its note and its pitch in Hz,
// and the file keeps the sources those facts were checked against.
import openStrings from "../content/open-strings.json" with { type: "json" };

export const OPEN_STRINGS = openStrings;

// Tuning changes only with a deploy, so browsers may reuse it for a while.
export function getOpenStrings() {
  return Response.json(OPEN_STRINGS, { headers: { "Cache-Control": "public, max-age=300" } });
}
