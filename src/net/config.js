// The online server is a separate process (see server/index.js) — it is not
// part of the Vite build and must be run and hosted independently. Defaults to
// localhost for local development; override via VITE_WS_URL for a deployed server.
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8787';
