// Turns api-worker/seed/part-texts.json (the content source of truth) into SQL and loads it
// into D1. Safe to run again: it deletes the old rows first.
//   node scripts/seed-sql.mjs            local database (used by npm run dev)
//   node scripts/seed-sql.mjs --remote   the real Cloudflare database (only on purpose)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const LANGS = ["en", "mn"];

// SQL text literal: NULL for missing values, single quotes doubled inside.
const literal = (value) => (value === null || value === undefined ? "NULL" : `'${String(value).replaceAll("'", "''")}'`);

export function seedSql(content) {
  const lines = ["DELETE FROM part_sources;", "DELETE FROM part_texts;"];
  for (const part of content.parts) {
    for (const lang of LANGS) {
      const text = part[lang] ?? {};
      const values = [part.id, lang, text.whatItDoes, text.madeOf, text.whereItSits, text.funFact].map(literal);
      lines.push(`INSERT INTO part_texts (part_id, lang, what_it_does, made_of, where_it_sits, fun_fact) VALUES (${values.join(", ")});`);
    }
    (part.sources ?? []).forEach((source, position) => {
      const values = [literal(part.id), position, literal(source.title), literal(source.url)];
      lines.push(`INSERT INTO part_sources (part_id, position, title, url) VALUES (${values.join(", ")});`);
    });
  }
  return `${lines.join("\n")}\n`;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const apiDir = join(root, "api-worker");
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");

// Runs wrangler inside api-worker (where wrangler.jsonc lives) and stops on failure.
// Quiet mode hides wrangler's long output unless something goes wrong.
export function runWrangler(args, { quiet = false } = {}) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: apiDir, stdio: quiet ? "pipe" : "inherit", encoding: "utf8" });
  if (result.status !== 0) {
    if (quiet) console.error(result.stdout, result.stderr);
    throw new Error(`wrangler ${args.join(" ")} failed`);
  }
}

export async function seed({ remote = false } = {}) {
  const content = JSON.parse(await readFile(join(apiDir, "seed", "part-texts.json"), "utf8"));
  const outDir = join(apiDir, ".wrangler", "seed");
  await mkdir(outDir, { recursive: true });
  const file = join(outDir, "part-texts.sql");
  await writeFile(file, seedSql(content));
  runWrangler(["d1", "execute", "soulkey-db", remote ? "--remote" : "--local", "--file", file, "--yes"], { quiet: !remote });
  console.log(`Part texts loaded into the ${remote ? "remote" : "local"} D1 database (${content.parts.length} parts).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await seed({ remote: process.argv.includes("--remote") });
}
