// <sk-stage selected="bridge" selected-group="fittings" mode="explore" lang="en">
// In:  selected (part id or empty), selected-group (that part's group), mode (explore, assemble or play),
//      lang (en or mn), and the `openStrings` property: [{ partId, note }] from the API, in keyboard order
// Out: "sk-part-pick" event with detail.id (a part id, or null for empty space)
//      "sk-pluck" event with detail.id (a string's part id), in Play
//      "sk-bow" event with detail.id and detail.level (0 to 1; 0 means the bow has left the string), in Play
// Light DOM, so page tokens style it (Week 4: light DOM when shared styling is the contract).
import { StageScene } from "../scene/stage-scene.js";
import { readPalette } from "../scene/palette.js";
import { t } from "../data/strings.js";
import { playKeyAction, isTypingTarget } from "./play-keys.js";

const KEY_BOW_LEVEL = 0.7;
const NOTE_SHOWN_MS = 1400;

class SkStage extends HTMLElement {
  static observedAttributes = ["selected", "selected-group", "mode", "lang"];

  #openStrings = [];

  // The open strings from the API. Set by the page, like `catalog` on the panel.
  set openStrings(list) {
    this.#openStrings = Array.isArray(list) ? list : [];
    this.scene?.setStrings(this.#openStrings.map((string) => string.partId));
  }

  get openStrings() {
    return this.#openStrings;
  }

  connectedCallback() {
    if (this.scene) return;
    this.classList.add("stage");
    this.tabIndex = 0;
    this.setAttribute("role", "application");
    this.hint = document.createElement("p");
    this.hint.className = "stage__hint";
    this.hint.setAttribute("aria-hidden", "true");
    // The note name of the string that sounds. role="status" reads it out without moving focus.
    this.note = document.createElement("p");
    this.note.className = "stage__note";
    this.note.setAttribute("role", "status");
    this.note.lang = "en";
    this.append(this.hint, this.note);
    this.keyBows = new Map();

    this.scene = new StageScene(this, {
      palette: readPalette(),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      onPick: (id) => this.dispatchEvent(new CustomEvent("sk-part-pick", { bubbles: true, detail: { id } })),
      onHover: (over) => { this.dataset.hover = String(over); },
      onStatus: (status) => {
        this.dataset.status = status;
        this.syncLang();
      },
      onPluck: (id) => {
        this.showNote(id);
        this.dispatchEvent(new CustomEvent("sk-pluck", { bubbles: true, detail: { id } }));
      },
      onBow: (id, level) => {
        if (level > 0) this.showNote(id, { hold: true });
        else this.hideNoteSoon();
        this.dispatchEvent(new CustomEvent("sk-bow", { bubbles: true, detail: { id, level } }));
      },
    });
    this.scene.setStrings(this.#openStrings.map((string) => string.partId));

    this.keys = new AbortController();
    const { signal } = this.keys;
    this.addEventListener("keydown", (event) => {
      if (this.scene.nudge(event.key)) event.preventDefault();
    }, { signal });
    // Play keys work wherever focus is on the page (except in text fields), so after choosing
    // the Play tab the numbers play at once.
    document.addEventListener("keydown", (event) => this.playKeyDown(event), { signal });
    document.addEventListener("keyup", (event) => this.playKeyUp(event), { signal });
    window.addEventListener("blur", () => this.stopKeyBows(), { signal });

    this.syncLang();
    this.syncSelected();
    this.syncMode();
  }

  disconnectedCallback() {
    this.keys?.abort();
    clearTimeout(this.noteTimer);
    this.scene?.dispose();
    this.scene = null;
    this.hint?.remove();
    this.note?.remove();
  }

  attributeChangedCallback(name) {
    if (!this.scene) return;
    if (name === "selected" || name === "selected-group") this.syncSelected();
    if (name === "mode") this.syncMode();
    if (name === "lang") this.syncLang();
  }

  get playing() {
    return this.getAttribute("mode") === "play";
  }

  syncSelected() {
    const id = this.getAttribute("selected") || null;
    this.scene.select(id, { isInside: this.getAttribute("selected-group") === "inside" });
  }

  syncMode() {
    if (!this.playing) {
      this.stopKeyBows();
      this.hideNote();
    }
    this.scene.setMode(this.getAttribute("mode") || "explore");
    this.syncLang();
  }

  syncLang() {
    const lang = this.getAttribute("lang") || "en";
    this.setAttribute("aria-label", t(lang, this.playing ? "playLabel" : "stageLabel"));
    const hintKey = this.dataset.status === "loading" ? "modelLoading" : this.playing ? "playHint" : "hint";
    this.hint.textContent = t(lang, hintKey);
  }

  // ---- Play keys: 1 to 4 pluck, Shift + 1 to 4 held down bows ----

  playKeyDown(event) {
    if (!this.playing || isTypingTarget(event.target)) return;
    const action = playKeyAction(event, this.#openStrings.length);
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return;
    const id = this.#openStrings[action.index].partId;
    if (!action.bow) {
      this.scene.pluck(id);
      return;
    }
    this.keyBows.set(event.code, id);
    this.scene.bow(id, KEY_BOW_LEVEL);
  }

  playKeyUp(event) {
    if (event.key === "Shift") {
      this.stopKeyBows();
      return;
    }
    const id = this.keyBows.get(event.code);
    if (!id) return;
    this.keyBows.delete(event.code);
    this.scene.bow(id, 0);
  }

  stopKeyBows() {
    this.keyBows?.forEach((id) => this.scene?.bow(id, 0));
    this.keyBows?.clear();
  }

  // ---- Note name ----

  showNote(id, { hold = false } = {}) {
    const string = this.#openStrings.find((item) => item.partId === id);
    if (!string) return;
    if (this.note.textContent !== string.note || this.note.dataset.shown !== "true") this.note.textContent = string.note;
    this.note.dataset.shown = "true";
    clearTimeout(this.noteTimer);
    if (!hold) this.hideNoteSoon();
  }

  hideNoteSoon() {
    clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => this.hideNote(), NOTE_SHOWN_MS);
  }

  hideNote() {
    clearTimeout(this.noteTimer);
    if (this.note) this.note.dataset.shown = "false";
  }
}

customElements.define("sk-stage", SkStage);
