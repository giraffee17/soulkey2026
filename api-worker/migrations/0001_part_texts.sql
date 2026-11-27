-- Part texts for the info panel (PLAN.md, Part content). One row per part and language.
-- A NULL field means "not written yet": the site shows the English text or a placeholder.
CREATE TABLE IF NOT EXISTS part_texts (
  part_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'mn')),
  what_it_does TEXT,
  made_of TEXT,
  where_it_sits TEXT,
  fun_fact TEXT,
  PRIMARY KEY (part_id, lang)
);

-- Every fact keeps its link (PLAN.md, Source rules). Position keeps the order of the list.
CREATE TABLE IF NOT EXISTS part_sources (
  part_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  PRIMARY KEY (part_id, position)
);
