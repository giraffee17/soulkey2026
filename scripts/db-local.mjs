// Prepares the local D1 database for development: create the tables, then load the part texts.
// npm run dev calls this first, so a fresh clone works with one command.
import { fileURLToPath } from "node:url";
import { runWrangler, seed } from "./seed-sql.mjs";

export async function prepareLocalDb() {
  runWrangler(["d1", "migrations", "apply", "soulkey-db", "--local"], { quiet: true });
  await seed({ remote: false });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await prepareLocalDb();
}
