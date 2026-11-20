// Shared app state: a named group of signals (Week 5 store idea).
import { createSignal } from "./signal.js";
import { PART_IDS } from "../data/parts.js";

export const MODES = ["explore", "assemble", "play"];
export const LANGS = ["en", "mn"];

const LANG_KEY = "soulkey.lang";

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

export const store = {
  mode,
  selectedPart,
  lang,

  setMode(next) {
    if (MODES.includes(next)) setModeSignal(next);
  },

  // Only known part ids are accepted; anything else clears the selection.
  selectPart(id) {
    setSelectedSignal(PART_IDS.includes(id) ? id : null);
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
};
