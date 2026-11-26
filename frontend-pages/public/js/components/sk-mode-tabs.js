// <sk-mode-tabs mode="explore" lang="en" available="explore">
// In:  mode (current mode), lang, available (space separated modes that work yet)
// Out: "sk-mode-change" event with detail.mode
// Assemble and Play arrive in later weeks; until then they show "soon".
// Keyboard follows the ARIA tabs pattern: Tab lands on the current mode only,
// Left and Right arrows, Home and End move between tabs, Enter or Space switches.
import { MODES } from "../framework/store.js";
import { t } from "../data/strings.js";
import { nextTabIndex } from "./tab-keys.js";

const LABEL_KEYS = { explore: "modeExplore", assemble: "modeAssemble", play: "modePlay" };

class SkModeTabs extends HTMLElement {
  static observedAttributes = ["mode", "lang", "available"];

  connectedCallback() {
    this.classList.add("mode-tabs");
    this.setAttribute("role", "tablist");
    this.life = new AbortController();
    const { signal } = this.life;
    this.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-mode]");
      if (!tab || tab.getAttribute("aria-disabled") === "true") return;
      this.dispatchEvent(new CustomEvent("sk-mode-change", { bubbles: true, detail: { mode: tab.dataset.mode } }));
    }, { signal });
    this.addEventListener("keydown", (event) => this.moveFocus(event), { signal });
    this.render();
  }

  disconnectedCallback() {
    this.life?.abort();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  // Builds the tabs once, then only patches their text and state,
  // so the focused tab stays focused when the mode or language changes.
  render() {
    if (!this.childElementCount) this.build();
    const lang = this.getAttribute("lang") || "en";
    const current = this.getAttribute("mode") || "explore";
    const available = (this.getAttribute("available") || "explore").split(" ");
    this.setAttribute("aria-label", t(lang, "modesLabel"));

    this.tabs().forEach((tab) => {
      const { mode } = tab.dataset;
      const ready = available.includes(mode);
      tab.firstChild.data = t(lang, LABEL_KEYS[mode]);
      tab.setAttribute("aria-selected", String(mode === current));
      tab.tabIndex = mode === current ? 0 : -1;
      if (ready) tab.removeAttribute("aria-disabled");
      else tab.setAttribute("aria-disabled", "true");
      const soon = tab.querySelector(".mode-tabs__soon");
      soon.hidden = ready;
      soon.textContent = `(${t(lang, "soon")})`;
    });
  }

  build() {
    this.replaceChildren(...MODES.map((mode) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "mode-tabs__tab";
      tab.dataset.mode = mode;
      tab.setAttribute("role", "tab");
      const soon = document.createElement("span");
      soon.className = "mode-tabs__soon";
      tab.append(document.createTextNode(""), soon);
      return tab;
    }));
  }

  tabs() {
    return [...this.querySelectorAll("[data-mode]")];
  }

  moveFocus(event) {
    const tabs = this.tabs();
    const next = nextTabIndex(event.key, tabs.indexOf(event.target.closest("[data-mode]")), tabs.length);
    if (next === null) return;
    event.preventDefault();
    tabs[next].focus();
  }
}

customElements.define("sk-mode-tabs", SkModeTabs);
