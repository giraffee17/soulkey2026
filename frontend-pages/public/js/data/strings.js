// Interface text in both languages. The Mongolian was drafted by Claude and
// still needs Maralgua's check (PLAN.md, Source rules).
export const STRINGS = {
  en: {
    stageLabel: "3D violin. Drag or use the arrow keys to rotate, scroll or use plus and minus to zoom, click a part to learn about it.",
    hint: "Drag to rotate, scroll to zoom, click a part",
    emptyTitle: "Choose a part",
    emptyBody: "Click any part of the violin, or pick one from the list below.",
    whatItDoes: "What it does",
    madeOf: "Made of",
    whereItSits: "Where it sits",
    pending: "Coming with the content update",
    funFact: "Fun fact",
    sources: "Sources",
    loading: "Loading…",
    loadError: "Couldn't load this part's info. Please try again.",
    partsHeading: "Parts",
    sheetOpen: "Show parts",
    sheetClose: "Hide parts",
    modeExplore: "Explore",
    modeAssemble: "Assemble",
    modePlay: "Play",
    soon: "soon",
    modesLabel: "Modes",
    langLabel: "Language",
  },
  mn: {
    stageLabel: "Гурван хэмжээст хийл. Эргүүлэхийн тулд чирэх эсвэл сум товч, томруулахын тулд гүйлгэх эсвэл нэмэх хасах товч ашиглана. Хэсэг дээр дарж танилцана уу.",
    hint: "Чирж эргүүлнэ, гүйлгэж томруулна, хэсэг дээр дарна",
    emptyTitle: "Хэсгээ сонгоно уу",
    emptyBody: "Хийлийн аль нэг хэсэг дээр дарах эсвэл доорх жагсаалтаас сонгоно уу.",
    whatItDoes: "Үүрэг",
    madeOf: "Материал",
    whereItSits: "Байрлал",
    pending: "Агуулга удахгүй нэмэгдэнэ",
    funFact: "Сонирхолтой баримт",
    sources: "Эх сурвалж",
    loading: "Ачаалж байна…",
    loadError: "Мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.",
    partsHeading: "Хэсгүүд",
    sheetOpen: "Хэсгүүдийг харах",
    sheetClose: "Хэсгүүдийг хаах",
    modeExplore: "Судлах",
    modeAssemble: "Угсрах",
    modePlay: "Тоглох",
    soon: "удахгүй",
    modesLabel: "Горим",
    langLabel: "Хэл",
  },
};

export function t(lang, key) {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}
