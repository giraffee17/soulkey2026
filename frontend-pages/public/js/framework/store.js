// Shared app state: a named group of signals (Week 5 store idea).
import { createSignal } from "./signal.js";

export const MODES = ["explore", "assemble", "play"];
export const LANGS = ["en", "mn"];
export const CATALOG_STATUSES = ["loading", "ready", "error"];

const LANG_KEY = "soulkey.lang";
const PART_ID = /^[a-z-]+$/;

function savedLang() {
  try {
    const value = localStorage.getItem(LANG_KEY);
    return LANGS.includes(value) ? value : "en";
  } catch {
    return "en";
  }
}

const [mode, setModeSignal] = createSignal("explore");
const [selectedPart, setSelectedSignal] = createSignal(null);
const [lang, setLangSignal] = createSignal(savedLang());
const [catalog, setCatalogSignal] = createSignal(null);
const [catalogStatus, setCatalogStatusSignal] = createSignal("loading");

export const store = {
  mode,
  selectedPart,
  lang,
  catalog,
  catalogStatus,

  setMode(next) {
    if (MODES.includes(next)) setModeSignal(next);
  },

  // Until the catalog arrives any well-formed id is kept (a #/part/... link on first load);
  // once it has arrived, only ids the server knows are accepted.
  selectPart(id) {
    const known = catalog();
    const valid = typeof id === "string" && PART_ID.test(id) && (!known || known.ids.includes(id));
    setSelectedSignal(valid ? id : null);
  },

  setLang(next) {
    if (!LANGS.includes(next)) return;
    setLangSignal(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // Storage can be unavailable (private mode). The choice still works for this visit.
    }
  },

  // One status at a time (Week 6): loading, then ready with a catalog, or error.
  setCatalogStatus(status) {
    if (CATALOG_STATUSES.includes(status)) setCatalogStatusSignal(status);
  },

  setCatalog(next) {
    setCatalogSignal(next);
    setCatalogStatusSignal("ready");
    store.selectPart(selectedPart());
  },
};
