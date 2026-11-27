// Where the API Worker lives. On this computer it is the local `npm run dev` Worker.
// Anywhere else (the live site) it is the deployed soulkey-api Worker on Cloudflare.
export const LOCAL_API_BASE = "http://127.0.0.1:8787";
export const DEPLOYED_API_BASE = "https://soulkey-api.maralgua-d17.workers.dev";

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

export function apiBase(hostname = globalThis.location?.hostname ?? "") {
  return LOCAL_HOSTS.includes(hostname) ? LOCAL_API_BASE : DEPLOYED_API_BASE;
}
