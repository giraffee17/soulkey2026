// The violin parts catalog, fetched from the API Worker (GET /api/parts).
// The server owns the data; the frontend only reads it.

// Checks the JSON has the shape the site needs, so a bad response fails clearly.
export function createCatalog(json) {
  if (!json || !Array.isArray(json.groups) || !Array.isArray(json.parts)) {
    throw new Error("The parts catalog is missing its groups or parts.");
  }
  const { groups, parts } = json;
  const groupIds = groups.map((group) => group.id);
  parts.forEach((part) => {
    if (!part.id || !groupIds.includes(part.group) || !part.name?.en) {
      throw new Error(`The parts catalog has a broken part: ${part.id ?? "(no id)"}`);
    }
  });
  return {
    groups,
    parts,
    ids: parts.map((part) => part.id),
    findPart: (id) => parts.find((part) => part.id === id) ?? null,
    findGroup: (id) => groups.find((group) => group.id === id) ?? null,
  };
}

export async function fetchCatalog(origin, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${origin}/api/parts`, { signal });
  if (!response.ok) throw new Error(`The API answered ${response.status}.`);
  return createCatalog(await response.json());
}

// Text in the chosen language, or English when that translation is missing.
export function localText(field, lang) {
  return field?.[lang] || field?.en || "";
}

export function localName(item, lang) {
  return localText(item.name, lang);
}
