// The open strings Play mode can sound, fetched from the API Worker (GET /api/strings).
// The server owns the notes and pitches; the frontend only reads them.
// Their order is the keyboard order: key 1 plays the first string, key 4 the last.

// Checks the JSON has the shape Play mode needs, so a bad response fails clearly.
export function createOpenStrings(json) {
  if (!json || !Array.isArray(json.strings) || !json.strings.length) {
    throw new Error("The open strings are missing.");
  }
  return json.strings.map((string) => {
    const { partId, note, pitch, frequencyHz } = string ?? {};
    if (typeof partId !== "string" || !note || !(Number.isFinite(frequencyHz) && frequencyHz > 0)) {
      throw new Error(`The open strings have a broken string: ${partId ?? "(no part id)"}`);
    }
    return { partId, note, pitch: pitch ?? note, frequencyHz };
  });
}

export async function fetchOpenStrings(origin, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${origin}/api/strings`, { signal });
  if (!response.ok) throw new Error(`The API answered ${response.status}.`);
  return createOpenStrings(await response.json());
}
