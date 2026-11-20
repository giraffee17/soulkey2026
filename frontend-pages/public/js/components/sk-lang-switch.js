// <sk-lang-switch lang="en">
// In:  lang (en or mn)
// Out: "sk-lang-change" event with detail.lang
import { t } from "../data/strings.js";

const OPTIONS = [
  { lang: "en", label: "EN" },
  { lang: "mn", label: "МН" },
];

class SkLangSwitch extends HTMLElement {
  static observedAttributes = ["lang"];

  connectedCallback() {
    this.classList.add("lang-switch");
    this.setAttribute("role", "group");
    this.life = new AbortController();
    this.addEventListener("click", (event) => {
      const option = event.target.closest("[data-lang]");
      if (option) this.dispatchEvent(new CustomEvent("sk-lang-change", { bubbles: true, detail: { lang: option.dataset.lang } }));
    }, { signal: this.life.signal });
    this.render();
  }

  disconnectedCallback() {
    this.life?.abort();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  // Builds the buttons once, then only patches their state, so keyboard focus stays put.
  render() {
    if (!this.childElementCount) {
      this.replaceChildren(...OPTIONS.map(({ lang, label }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "lang-switch__option";
        button.dataset.lang = lang;
        button.lang = lang;
        button.textContent = label;
        return button;
      }));
    }
    const current = this.getAttribute("lang") || "en";
    this.setAttribute("aria-label", t(current, "langLabel"));
    this.querySelectorAll("[data-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === current));
    });
  }
}

customElements.define("sk-lang-switch", SkLangSwitch);
