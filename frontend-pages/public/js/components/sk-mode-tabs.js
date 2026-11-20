// <sk-mode-tabs mode="explore" lang="en" available="explore">
// In:  mode (current mode), lang, available (space separated modes that work yet)
// Out: "sk-mode-change" event with detail.mode
// Assemble and Play arrive in later weeks; until then they show "soon".
import { MODES } from "../framework/store.js";
import { t } from "../data/strings.js";

const LABEL_KEYS = { explore: "modeExplore", assemble: "modeAssemble", play: "modePlay" };

class SkModeTabs extends HTMLElement {
  static observedAttributes = ["mode", "lang", "available"];

  connectedCallback() {
    this.classList.add("mode-tabs");
    this.setAttribute("role", "tablist");
    this.life = new AbortController();
    this.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-mode]");
      if (!tab || tab.getAttribute("aria-disabled") === "true") return;
      this.dispatchEvent(new CustomEvent("sk-mode-change", { bubbles: true, detail: { mode: tab.dataset.mode } }));
    }, { signal: this.life.signal });
    this.render();
  }

  disconnectedCallback() {
    this.life?.abort();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const lang = this.getAttribute("lang") || "en";
    const current = this.getAttribute("mode") || "explore";
    const available = (this.getAttribute("available") || "explore").split(" ");
    this.setAttribute("aria-label", t(lang, "modesLabel"));

    const tabs = MODES.map((mode) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "mode-tabs__tab";
      tab.dataset.mode = mode;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(mode === current));
      tab.textContent = t(lang, LABEL_KEYS[mode]);
      if (!available.includes(mode)) {
        tab.setAttribute("aria-disabled", "true");
        const soon = document.createElement("span");
        soon.className = "mode-tabs__soon";
        soon.textContent = `(${t(lang, "soon")})`;
        tab.append(soon);
      }
      return tab;
    });
    this.replaceChildren(...tabs);
  }
}

customElements.define("sk-mode-tabs", SkModeTabs);
