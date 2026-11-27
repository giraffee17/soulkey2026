// Loads a part's info texts from the API, with a small cache (Week 6, size limited cache).
// The cache keeps the most recently used parts; the oldest one leaves when it is full.
// Failed requests are never cached, so the next try asks the API again.
export function createPartTexts({ fetchFn = globalThis.fetch.bind(globalThis), base, limit = 12 }) {
  const cache = new Map();

  const remember = (id, data) => {
    cache.delete(id);
    cache.set(id, data);
    if (cache.size > limit) cache.delete(cache.keys().next().value);
  };

  async function load(id, { signal } = {}) {
    if (cache.has(id)) {
      const data = cache.get(id);
      remember(id, data); // mark as recently used
      return data;
    }
    const response = await fetchFn(`${base}/api/parts/${encodeURIComponent(id)}`, { signal });
    if (!response.ok) throw new Error(`Part texts for ${id}: HTTP ${response.status}`);
    const data = await response.json();
    remember(id, data);
    return data;
  }

  return { load, size: () => cache.size };
}

// One field in the chosen language, or the English text when that translation is missing.
// Returns the text with its real language, so the page can mark English text as English.
export function pickText(texts, lang, key) {
  const own = texts?.[lang]?.[key];
  if (own) return { text: own, lang };
  const english = texts?.en?.[key];
  return english ? { text: english, lang: "en" } : null;
}
