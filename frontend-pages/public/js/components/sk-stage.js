// <sk-stage selected="bridge" selected-group="fittings" lang="en">
// In:  selected (part id or empty), selected-group (that part's group), lang (en or mn)
// Out: "sk-part-pick" event with detail.id (a part id, or null for empty space)
// Light DOM, so page tokens style it (Week 4: light DOM when shared styling is the contract).
import { StageScene } from "../scene/stage-scene.js";
import { readPalette } from "../scene/palette.js";
import { t } from "../data/strings.js";

class SkStage extends HTMLElement {
  static observedAttributes = ["selected", "selected-group", "lang"];

  connectedCallback() {
    if (this.scene) return;
    this.classList.add("stage");
    this.tabIndex = 0;
    this.setAttribute("role", "application");
    this.hint = document.createElement("p");
    this.hint.className = "stage__hint";
    this.hint.setAttribute("aria-hidden", "true");
    this.append(this.hint);

    this.scene = new StageScene(this, {
      palette: readPalette(),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      onPick: (id) => this.dispatchEvent(new CustomEvent("sk-part-pick", { bubbles: true, detail: { id } })),
      onHover: (over) => { this.dataset.hover = String(over); },
      onStatus: (status) => {
        this.dataset.status = status;
        this.syncLang();
      },
    });

    this.keys = new AbortController();
    this.addEventListener("keydown", (event) => {
      if (this.scene.nudge(event.key)) event.preventDefault();
    }, { signal: this.keys.signal });

    this.syncLang();
    this.syncSelected();
  }

  disconnectedCallback() {
    this.keys?.abort();
    this.scene?.dispose();
    this.scene = null;
    this.hint?.remove();
  }

  attributeChangedCallback(name) {
    if (!this.scene) return;
    if (name === "selected" || name === "selected-group") this.syncSelected();
    if (name === "lang") this.syncLang();
  }

  syncSelected() {
    const id = this.getAttribute("selected") || null;
    this.scene.select(id, { isInside: this.getAttribute("selected-group") === "inside" });
  }

  syncLang() {
    const lang = this.getAttribute("lang") || "en";
    this.setAttribute("aria-label", t(lang, "stageLabel"));
    this.hint.textContent = t(lang, this.dataset.status === "loading" ? "loading" : "hint");
  }
}

customElements.define("sk-stage", SkStage);
