// <sk-panel part="bridge" lang="en" status="ready">
// In:  part (part id or empty), lang (en or mn), status (loading, ready or error),
//      and the .catalog property (the parts catalog from the API)
// Out: "sk-catalog-retry" event when the reader asks to try loading again
// Shows the part name and its info table. Text comes from the API; empty rows say it's on its way.
import { localName, localText } from "../data/catalog.js";
import { t } from "../data/strings.js";

const ROWS = ["whatItDoes", "madeOf", "whereItSits"];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

class SkPanel extends HTMLElement {
  static observedAttributes = ["part", "lang", "status"];

  #catalog = null;

  set catalog(value) {
    this.#catalog = value;
    if (this.isConnected) this.render();
  }

  get catalog() {
    return this.#catalog;
  }

  connectedCallback() {
    this.classList.add("part-info");
    this.setAttribute("aria-live", "polite");
    this.life = new AbortController();
    this.addEventListener("click", (event) => {
      if (event.target.closest("[data-retry]")) this.dispatchEvent(new CustomEvent("sk-catalog-retry", { bubbles: true }));
    }, { signal: this.life.signal });
    this.render();
  }

  disconnectedCallback() {
    this.life?.abort();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  message(lang, titleKey, bodyKey, retry = false) {
    const title = element("h2", "part-info__title", t(lang, titleKey));
    title.setAttribute("lang", lang);
    const nodes = [title, element("p", "part-info__empty", t(lang, bodyKey))];
    if (retry) {
      const button = element("button", "part-info__retry", t(lang, "retry"));
      button.type = "button";
      button.dataset.retry = "true";
      nodes.push(button);
    }
    this.replaceChildren(...nodes);
  }

  render() {
    const lang = this.getAttribute("lang") || "en";
    const status = this.getAttribute("status") || "loading";
    if (status === "loading") return this.message(lang, "catalogLoadingTitle", "catalogLoading");
    if (status === "error") return this.message(lang, "catalogErrorTitle", "catalogError", true);

    const part = this.#catalog?.findPart(this.getAttribute("part") || "");
    if (!part) return this.message(lang, "emptyTitle", "emptyBody");

    // The script title font is for English only; Mongolian titles use Arial (PLAN.md, Fonts).
    const title = element("h2", "part-info__title", localName(part, lang));
    title.setAttribute("lang", part.name[lang] ? lang : "en");
    const group = element("p", "part-info__group", localName(this.#catalog.findGroup(part.group), lang));

    const table = element("dl", "info-table");
    const rows = localText(part.funFact, lang) ? [...ROWS, "funFact"] : ROWS;
    rows.forEach((key) => {
      const row = element("div", "info-table__row");
      const text = localText(part[key], lang);
      const value = element("dd", "info-table__value", text || t(lang, "pending"));
      if (!text) value.dataset.pending = "true";
      row.append(element("dt", "info-table__label", t(lang, key)), value);
      table.append(row);
    });

    const nodes = [title, group, table];
    if (part.sources?.length) nodes.push(this.sources(lang, part.sources));
    this.replaceChildren(...nodes);
  }

  // Sources stay folded: most readers want the facts, curious ones can open them (Week 1).
  sources(lang, list) {
    const details = element("details", "part-info__sources");
    details.append(element("summary", "info-table__label", t(lang, "sources")));
    const items = element("ul");
    list.forEach((source) => {
      const link = element("a", "", source.title || source.url);
      link.href = source.url;
      link.rel = "noopener noreferrer";
      link.target = "_blank";
      const item = element("li");
      item.append(link);
      items.append(item);
    });
    details.append(items);
    return details;
  }
}

customElements.define("sk-panel", SkPanel);
