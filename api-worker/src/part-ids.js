// The part ids, read from the catalog in content/parts.json (the one list, PLAN.md "Part content").
import catalog from "../content/parts.json" with { type: "json" };

export const CATALOG = catalog;
export const PART_IDS = catalog.parts.map((part) => part.id);
