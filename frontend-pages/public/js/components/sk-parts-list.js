// <sk-parts-list selected="bridge" lang="en">
// In:  selected (part id or empty), lang (en or mn)
// Out: "sk-part-pick" event with detail.id
// The list makes tiny and hidden parts (like the soundpost) easy to find, and
// gives keyboard users the same path as clicking the 3D model (Week 1: recognition over recall).
import { GROUPS, PARTS, localName } from "../data/parts.js";
import { t } from "../data/strings.js";

class SkPartsList extends HTMLElement {
  static observedAttributes = ["selected", "lang"];

  connectedCallback() {
    this.classList.add("parts-list");
    this.life = new AbortController();
    this.addEventListener("click", (event) => {
      const button = event.target.closest("[data-part]");
      if (!button) return;
      const id = button.dataset.part;
      const next = id === this.getAttribute("selected") ? null : id;
      this.dispatchEvent(new CustomEvent("sk-part-pick", { bubbles: true, detail: { id: next } }));
    }, { signal: this.life.signal });
    this.render();
  }

  disconnectedCallback() {
    this.life?.abort();
  }

  attributeChangedCallback(name) {
    if (!this.isConnected) return;
    if (name === "selected") this.syncPressed();
    else this.render();
  }

  render() {
    const lang = this.getAttribute("lang") || "en";
    const heading = document.createElement("h2");
    heading.className = "visually-hidden";
    heading.textContent = t(lang, "partsHeading");

    const sections = GROUPS.map((group) => {
      const section = document.createElement("section");
      const title = document.createElement("h3");
      title.className = "parts-list__heading";
      title.textContent = localName(group, lang);
      const list = document.createElement("ul");
      list.className = "parts-list__items";
      PARTS.filter((part) => part.group === group.id).forEach((part) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "parts-list__item";
        button.dataset.part = part.id;
        button.textContent = localName(part, lang);
        item.append(button);
        list.append(item);
      });
      section.append(title, list);
      return section;
    });

    this.replaceChildren(heading, ...sections);
    this.syncPressed();
  }

  // Patch the pressed state instead of rebuilding, so keyboard focus stays put (Week 4).
  syncPressed() {
    const selected = this.getAttribute("selected");
    this.querySelectorAll("[data-part]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.part === selected));
    });
  }
}

customElements.define("sk-parts-list", SkPartsList);
