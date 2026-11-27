// Wires the components to the shared store. Components never import each other:
// attributes go in, events come out, and this file connects them (Week 4 contract).
import "./components/sk-stage.js";
import "./components/sk-panel.js";
import "./components/sk-parts-list.js";
import "./components/sk-mode-tabs.js";
import "./components/sk-lang-switch.js";
import { effect } from "./framework/signal.js";
import { store } from "./framework/store.js";
import { startRouter } from "./framework/router.js";
import { keepPanelTopInView } from "./panel-scroll.js";
import { t } from "./data/strings.js";
import { fetchCatalog } from "./data/catalog.js";
import { apiBase } from "./data/api.js";
import { fetchOpenStrings } from "./data/open-strings.js";
import { createStringPlayer } from "./audio/string-player.js";
import { createBottomSheet, SHEET_QUERY } from "./bottom-sheet.js";

const stage = document.querySelector("sk-stage");
const panel = document.querySelector("sk-panel");
const partsList = document.querySelector("sk-parts-list");
const modeTabs = document.querySelector("sk-mode-tabs");
const langSwitch = document.querySelector("sk-lang-switch");

const sheetLabels = (lang) => ({ open: t(lang, "sheetOpen"), close: t(lang, "sheetClose") });
const sheet = createBottomSheet({
  sheet: document.querySelector(".layout__panel"),
  handle: document.querySelector(".sheet-handle"),
  content: [panel, partsList],
  media: matchMedia(SHEET_QUERY),
  labels: sheetLabels(store.lang()),
});

// Events out of components, into the store.
document.addEventListener("sk-part-pick", (event) => store.selectPart(event.detail.id));
document.addEventListener("sk-mode-change", (event) => store.setMode(event.detail.mode));
document.addEventListener("sk-lang-change", (event) => store.setLang(event.detail.lang));
document.addEventListener("sk-catalog-retry", () => {
  loadCatalog();
  if (!store.openStrings()) loadOpenStrings();
});

// Play: the stage says which string sounds; the player makes the sound at that string's pitch.
const player = createStringPlayer();
const frequencyOf = (id) => store.openStrings()?.find((string) => string.partId === id)?.frequencyHz;
document.addEventListener("sk-pluck", (event) => {
  const frequency = frequencyOf(event.detail.id);
  if (frequency) player.pluck(frequency);
});
document.addEventListener("sk-bow", (event) => {
  const frequency = frequencyOf(event.detail.id);
  if (frequency) player.bow(event.detail.id, frequency, event.detail.level);
});

// The parts catalog comes from the API Worker. A newer request makes an older one stale (Week 6).
let catalogRequest = null;
async function loadCatalog() {
  catalogRequest?.abort();
  const request = new AbortController();
  catalogRequest = request;
  store.setCatalogStatus("loading");
  try {
    const catalog = await fetchCatalog(apiBase(), { signal: request.signal });
    if (catalogRequest === request) store.setCatalog(catalog);
  } catch (error) {
    if (request.signal.aborted) return;
    console.warn("Parts catalog failed to load.", error);
    store.setCatalogStatus("error");
  }
}

// The open strings (notes and pitches) come from the API Worker too. Play waits for them.
let stringsRequest = null;
async function loadOpenStrings() {
  stringsRequest?.abort();
  const request = new AbortController();
  stringsRequest = request;
  try {
    const strings = await fetchOpenStrings(apiBase(), { signal: request.signal });
    if (stringsRequest === request) store.setOpenStrings(strings);
  } catch (error) {
    if (request.signal.aborted) return;
    console.warn("Open strings failed to load; Play stays off.", error);
    store.setOpenStrings(null);
  }
}

// Store into component attributes. Each effect re-runs only when its own signal changes.
const setAttr = (element, name, value) => {
  if (value) element.setAttribute(name, value);
  else element.removeAttribute(name);
};

effect(() => {
  const catalog = store.catalog();
  panel.catalog = catalog;
  partsList.catalog = catalog;
});

effect(() => {
  panel.setAttribute("status", store.catalogStatus());
});

effect(() => {
  const id = store.selectedPart();
  setAttr(stage, "selected", id);
  setAttr(stage, "selected-group", store.catalog()?.findPart(id)?.group);
  setAttr(panel, "part", id);
  setAttr(partsList, "selected", id);
  if (id) sheet.setOpen(true);
});

effect(() => {
  stage.openStrings = store.openStrings() ?? [];
  modeTabs.setAttribute("available", store.availableModes().join(" "));
});

effect(() => {
  const mode = store.mode();
  modeTabs.setAttribute("mode", mode);
  stage.setAttribute("mode", mode);
  if (mode !== "play") player.stopAll();
});

effect(() => {
  const lang = store.lang();
  document.documentElement.lang = lang;
  [stage, panel, partsList, modeTabs, langSwitch].forEach((element) => element.setAttribute("lang", lang));
  sheet.setLabels(sheetLabels(lang));
});

// A newly chosen part's info is shown from the top, even if the panel was scrolled down.
keepPanelTopInView({ box: document.querySelector(".layout__panel"), selected: store.selectedPart });

startRouter(store);
loadCatalog();
loadOpenStrings();
