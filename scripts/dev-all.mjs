// Starts the API Worker (port 8787) and the Pages site (port 8788) together.
// Ctrl+C stops both. Same idea as the BrewFlow launcher from the Week 9 lecture.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = join(root, "node_modules", "wrangler", "bin", "wrangler.js");

const jobs = [
  // Each server gets its own debugger (inspector) port, or the second one fails to start.
  { name: "API", cwd: join(root, "api-worker"), args: ["dev", "--ip", "127.0.0.1", "--port", "8787", "--inspector-port", "9229"] },
  { name: "PAGES", cwd: join(root, "frontend-pages"), args: ["pages", "dev", "public", "--ip", "127.0.0.1", "--port", "8788", "--inspector-port", "9230"] },
];

const children = jobs.map(({ name, cwd, args }) => {
  const child = spawn(process.execPath, [wrangler, ...args], { cwd, stdio: ["inherit", "pipe", "pipe"] });
  const prefix = (chunk) => chunk.toString().split("\n").filter(Boolean).map((line) => `[${name}] ${line}`).join("\n");
  child.stdout.on("data", (chunk) => console.log(prefix(chunk)));
  child.stderr.on("data", (chunk) => console.error(prefix(chunk)));
  return child;
});

const stopAll = () => children.forEach((child) => child.kill("SIGINT"));
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
