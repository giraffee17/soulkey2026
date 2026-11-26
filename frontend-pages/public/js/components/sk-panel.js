// <sk-panel part="bridge" lang="en">
// In:  part (part id or empty), lang (en or mn)
// Shows the part name and its info table. The texts come from the API (D1), one request
// per part, cached. One status value says what the panel is doing (Week 6):
// idle (no part), loading, ready or error. A slow answer for an old part is ignored.
import { findPart, findGroup, localName } from "../data/parts.js";
import { t } from "../data/strings.js";
import { apiBase } from "../data/api.js";
import { createPartTexts, pickText } from "../data/part-texts.js";

const ROWS = ["whatItDoes", "madeOf", "whereItSits"];

// One shared loader, so the cache survives the panel being re-rendered.
const partTexts = createPartTexts({ base: apiBase() });

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

class SkPanel extends HTMLElement {
  static observedAttributes = ["part", "lang"];

  status = "idle";
  data = null;
  request = null;

  connectedCallback() {
    this.classList.add("part-info");
    this.setAttribute("aria-live", "polite");
    this.loadPart();
  }

  disconnectedCallback() {
    this.request?.abort();
    this.request = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;
    if (name === "part") this.loadPart();
    else this.render();
  }

  loadPart() {
    this.request?.abort();
    this.request = null;
    this.data = null;
    const id = this.getAttribute("part") || "";
    if (!findPart(id)) {
      this.status = "idle";
      this.render();
      return;
    }

    const request = new AbortController();
    this.request = request;
    this.status = "loading";
    this.render();

    partTexts.load(id, { signal: request.signal }).then(
      (data) => {
        if (request.signal.aborted || this.getAttribute("part") !== id) return; // stale answer
        this.status = "ready";
        this.data = data;
        this.render();
      },
      (error) => {
        if (request.signal.aborted || this.getAttribute("part") !== id) return;
        console.warn(error);
        this.status = "error";
        this.render();
      },
    );
  }

  render() {
    const lang = this.getAttribute("lang") || "en";
    const part = findPart(this.getAttribute("part") || "");

    if (!part) {
      const title = element("h2", "part-info__title", t(lang, "emptyTitle"));
      title.setAttribute("lang", lang);
      this.replaceChildren(title, element("p", "part-info__empty", t(lang, "emptyBody")));
      return;
    }

    // The script title font is for English only; Mongolian titles use Arial (PLAN.md, Fonts).
    const titleLang = part.name[lang] ? lang : "en";
    const title = element("h2", "part-info__title", localName(part, lang));
    title.setAttribute("lang", titleLang);
    const group = element("p", "part-info__group", localName(findGroup(part.group), lang));

    if (this.status === "error") {
      this.replaceChildren(title, group, element("p", "part-info__status", t(lang, "loadError")));
      return;
    }

    this.replaceChildren(title, group, this.table(lang));
  }

  table(lang) {
    const ready = this.status === "ready";
    const texts = this.data?.texts;
    const table = element("dl", "info-table");
    const rows = [];

    const addRow = (labelKey, value) => {
      const row = element("div", ready ? "info-table__row info-table__row--enter" : "info-table__row");
      row.style.setProperty("--row", rows.length);
      row.append(element("dt", "info-table__label", t(lang, labelKey)), value);
      rows.push(row);
    };

    ROWS.forEach((key) => {
      const picked = ready ? pickText(texts, lang, key) : null;
      const value = element("dd", "info-table__value", picked ? picked.text : t(lang, ready ? "pending" : "loading"));
      if (picked) value.setAttribute("lang", picked.lang);
      else value.dataset.pending = "true";
      addRow(key, value);
    });

    // Fun fact: only when there is one (PLAN.md, Part content).
    const funFact = ready ? pickText(texts, lang, "funFact") : null;
    if (funFact) {
      const value = element("dd", "info-table__value", funFact.text);
      value.setAttribute("lang", funFact.lang);
      addRow("funFact", value);
    }

    // Sources: folded, the summary names the sites, the list holds the links.
    const sources = ready ? this.data.sources ?? [] : [];
    if (sources.length) {
      const value = element("dd", "info-table__value");
      const details = element("details", "info-table__sources");
      const hosts = [...new Set(sources.map((source) => hostOf(source.url)))];
      const summary = element("summary", "info-table__summary", hosts.join(" · "));
      summary.setAttribute("lang", "en");
      const list = element("ul", "info-table__links");
      sources.forEach((source) => {
        const link = element("a", "info-table__link", source.title);
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute("lang", "en");
        const item = element("li");
        item.append(link);
        list.append(item);
      });
      details.append(summary, list);
      value.append(details);
      addRow("sources", value);
    }

    table.append(...rows);
    return table;
  }
}

customElements.define("sk-panel", SkPanel);
