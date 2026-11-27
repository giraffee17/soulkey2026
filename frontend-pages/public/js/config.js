// Where the API Worker lives. Locally `npm run dev` runs it on port 8787.
// PRODUCTION_API is the deployed soulkey-api Worker (see README, Deploy).
const PRODUCTION_API = "https://soulkey-api.REPLACE-WITH-YOUR-SUBDOMAIN.workers.dev";

const isLocal = ["127.0.0.1", "localhost"].includes(location.hostname);

export const API_ORIGIN = isLocal ? `http://${location.hostname}:8787` : PRODUCTION_API;
