// The one list of violin parts. The 3D model, the database and the URL all
// use these ids (see PLAN.md, "Part content"). Mongolian names stay empty
// until Maralgua fills in the correct violin terms; the UI falls back to English.

export const GROUPS = [
  { id: "body", name: { en: "Body", mn: "" } },
  { id: "neck", name: { en: "Neck and scroll", mn: "" } },
  { id: "fittings", name: { en: "Fittings", mn: "" } },
  { id: "inside", name: { en: "Inside", mn: "" } },
  { id: "bow", name: { en: "Bow", mn: "" } },
];

export const PARTS = [
  { id: "top", group: "body", name: { en: "Top", mn: "" } },
  { id: "back", group: "body", name: { en: "Back", mn: "" } },
  { id: "ribs", group: "body", name: { en: "Ribs", mn: "" } },
  { id: "f-holes", group: "body", name: { en: "F-holes", mn: "" } },
  { id: "purfling", group: "body", name: { en: "Purfling", mn: "" } },
  { id: "end-button", group: "body", name: { en: "End button", mn: "" } },

  { id: "neck", group: "neck", name: { en: "Neck", mn: "" } },
  { id: "scroll", group: "neck", name: { en: "Scroll", mn: "" } },
  { id: "pegbox", group: "neck", name: { en: "Pegbox", mn: "" } },
  { id: "pegs", group: "neck", name: { en: "Pegs", mn: "" } },
  { id: "nut", group: "neck", name: { en: "Nut", mn: "" } },
  { id: "fingerboard", group: "neck", name: { en: "Fingerboard", mn: "" } },

  { id: "bridge", group: "fittings", name: { en: "Bridge", mn: "" } },
  { id: "tailpiece", group: "fittings", name: { en: "Tailpiece", mn: "" } },
  { id: "fine-tuners", group: "fittings", name: { en: "Fine tuners", mn: "" } },
  { id: "chinrest", group: "fittings", name: { en: "Chinrest", mn: "" } },
  { id: "saddle", group: "fittings", name: { en: "Saddle", mn: "" } },
  { id: "string-g", group: "fittings", name: { en: "G string", mn: "" } },
  { id: "string-d", group: "fittings", name: { en: "D string", mn: "" } },
  { id: "string-a", group: "fittings", name: { en: "A string", mn: "" } },
  { id: "string-e", group: "fittings", name: { en: "E string", mn: "" } },

  { id: "soundpost", group: "inside", name: { en: "Soundpost", mn: "" } },
  { id: "bass-bar", group: "inside", name: { en: "Bass bar", mn: "" } },

  { id: "stick", group: "bow", name: { en: "Stick", mn: "" } },
  { id: "hair", group: "bow", name: { en: "Hair", mn: "" } },
  { id: "frog", group: "bow", name: { en: "Frog", mn: "" } },
  { id: "screw", group: "bow", name: { en: "Screw", mn: "" } },
  { id: "tip", group: "bow", name: { en: "Tip", mn: "" } },
];

export const PART_IDS = PARTS.map((part) => part.id);

export function findPart(id) {
  return PARTS.find((part) => part.id === id) ?? null;
}

export function findGroup(id) {
  return GROUPS.find((group) => group.id === id) ?? null;
}

// A name in the chosen language, or English when that translation is missing.
export function localName(item, lang) {
  return item.name[lang] || item.name.en;
}
