// Where the API Worker lives. On this computer it is the local `npm run dev` Worker.
// After the first deploy, set DEPLOYED_API_BASE to the Worker's address (Maralgua's decision).
export const LOCAL_API_BASE = "http://127.0.0.1:8787";
export const DEPLOYED_API_BASE = "";

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

export function apiBase(hostname = globalThis.location?.hostname ?? "") {
  return LOCAL_HOSTS.includes(hostname) ? LOCAL_API_BASE : DEPLOYED_API_BASE;
}
