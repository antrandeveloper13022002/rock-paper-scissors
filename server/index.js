// Entry point: `npm run server`, `node server/index.js` or `node server`.
import { createGameServer } from './gameServer.js';

const port = Number(process.env.PORT) || 8787;
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

createGameServer({ port, allowedOrigins });
console.log(`Online match server listening on port ${port}`);
