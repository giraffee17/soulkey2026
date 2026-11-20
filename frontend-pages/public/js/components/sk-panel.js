// <sk-panel part="bridge" lang="en">
// In:  part (part id or empty), lang (en or mn)
// Shows the part name and its info table. The table text comes from the API in week 2;
// until then each row says the content is on its way.
import { findPart, findGroup, localName } from "../data/parts.js";
import { t } from "../data/strings.js";

const ROWS = ["whatItDoes", "madeOf", "whereItSits"];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

class SkPanel extends HTMLElement {
  static observedAttributes = ["part", "lang"];

  connectedCallback() {
    this.classList.add("part-info");
    this.setAttribute("aria-live", "polite");
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const lang = this.getAttribute("lang") || "en";
    const part = findPart(this.getAttribute("part") || "");

    if (!part) {
      this.replaceChildren(
        element("h2", "part-info__title", t(lang, "emptyTitle")),
        element("p", "part-info__empty", t(lang, "emptyBody")),
      );
      this.querySelector(".part-info__title").setAttribute("lang", lang);
      return;
    }

    // The script title font is for English only; Mongolian titles use Arial (PLAN.md, Fonts).
    const titleLang = part.name[lang] ? lang : "en";
    const title = element("h2", "part-info__title", localName(part, lang));
    title.setAttribute("lang", titleLang);
    const group = element("p", "part-info__group", localName(findGroup(part.group), lang));

    const table = element("dl", "info-table");
    ROWS.forEach((key) => {
      const row = element("div", "info-table__row");
      const value = element("dd", "info-table__value", t(lang, "pending"));
      value.dataset.pending = "true";
      row.append(element("dt", "info-table__label", t(lang, key)), value);
      table.append(row);
    });

    this.replaceChildren(title, group, table);
  }
}

customElements.define("sk-panel", SkPanel);
