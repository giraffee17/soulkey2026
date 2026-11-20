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
import { t } from "./data/strings.js";

const stage = document.querySelector("sk-stage");
const panel = document.querySelector("sk-panel");
const partsList = document.querySelector("sk-parts-list");
const modeTabs = document.querySelector("sk-mode-tabs");
const langSwitch = document.querySelector("sk-lang-switch");
const sheet = document.querySelector(".layout__panel");
const sheetHandle = document.querySelector(".sheet-handle");

// Events out of components, into the store.
document.addEventListener("sk-part-pick", (event) => store.selectPart(event.detail.id));
document.addEventListener("sk-mode-change", (event) => store.setMode(event.detail.mode));
document.addEventListener("sk-lang-change", (event) => store.setLang(event.detail.lang));

const setOpen = (open) => {
  sheet.dataset.open = String(open);
  sheetHandle.setAttribute("aria-expanded", String(open));
  sheetHandle.textContent = t(store.lang(), open ? "sheetClose" : "sheetOpen");
};
sheetHandle.addEventListener("click", () => setOpen(sheet.dataset.open !== "true"));

// Store into component attributes. Each effect re-runs only when its own signal changes.
const setAttr = (element, name, value) => {
  if (value) element.setAttribute(name, value);
  else element.removeAttribute(name);
};

effect(() => {
  const id = store.selectedPart();
  setAttr(stage, "selected", id);
  setAttr(panel, "part", id);
  setAttr(partsList, "selected", id);
  if (id) setOpen(true);
});

effect(() => {
  modeTabs.setAttribute("mode", store.mode());
});

effect(() => {
  const lang = store.lang();
  document.documentElement.lang = lang;
  [stage, panel, partsList, modeTabs, langSwitch].forEach((element) => element.setAttribute("lang", lang));
  setOpen(sheet.dataset.open === "true");
});

startRouter(store);
