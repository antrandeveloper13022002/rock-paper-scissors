// WebSocket game server for online PvP (started by server/index.js). Reuses
// the exact same pure game engine the client uses locally against the NPC, so
// the rules of a match are guaranteed identical — the server is just the
// authoritative referee that arbitrates two real players.
import { WebSocketServer } from 'ws';
import { createMatch, matchReducer } from '../src/engine/reducer.js';
import { PHASES, SKILL_PHASE_SECONDS, CHOOSE_PHASE_SECONDS, otherSide } from '../src/engine/constants.js';
import { validateSetup, pickStage, redactFor } from './protocol.js';

const MAX_PAYLOAD_BYTES = 16 * 1024;

function makeRoomCode(rooms) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function send(ws, message) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

// ponytail: per-process in-memory rooms; a restart drops live matches, fine
// for short matches without accounts (see .claude/database-guideline.md).
export function createGameServer({
  port = 0,
  allowedOrigins = [],
  maxRooms = 500,
  maxMessagesPerSecond = 20,
  maxConnectionsPerIp = 8,
  waitingRoomTtlMs = 10 * 60 * 1000,
  rng = Math.random,
  nextTurnDelayMs = 3000,
} = {}) {
  // roomCode -> Room
  const rooms = new Map();
  // ws -> { roomCode, side }
  const socketInfo = new WeakMap();
  // client ip -> open connections
  const connectionsPerIp = new Map();

  function broadcastState(room) {
    send(room.sockets.player, { type: 'STATE', state: redactFor(room.state, 'player') });
    send(room.sockets.npc, { type: 'STATE', state: redactFor(room.state, 'npc') });
  }

  function clearRoomTimer(room) {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
  }

  // The server owns the countdown for skill/choose phases and the pause before
  // the next round, instead of trusting either client to time out fairly.
  function scheduleNext(room) {
    clearRoomTimer(room);
    if (!room.state) return;
    if (room.state.phase === PHASES.SKILL) {
      room.timer = setTimeout(() => applyAction(room, { type: 'TIMEOUT_SKILL' }), SKILL_PHASE_SECONDS * 1000);
    } else if (room.state.phase === PHASES.CHOOSE) {
      room.timer = setTimeout(() => applyAction(room, { type: 'TIMEOUT_CHOOSE' }), CHOOSE_PHASE_SECONDS * 1000);
    } else if (room.state.phase === PHASES.RESOLVED) {
      room.timer = setTimeout(() => applyAction(room, { type: 'NEXT_TURN' }), nextTurnDelayMs);
    }
  }

  function applyAction(room, action) {
    if (!room.state) return;
    const next = matchReducer(room.state, action);
    if (next === room.state) return; // reducer no-op (invalid/late action)
    room.state = next;
    broadcastState(room);
    scheduleNext(room);
  }

  function startMatch(room) {
    const { player, npc } = room.pending;
    room.state = createMatch({
      playerCharacter: player.character,
      playerComposition: player.composition,
      npcCharacter: npc.character,
      npcComposition: npc.composition,
    });
    const stageVotes = { player: player.stageVote, npc: npc.stageVote };
    const stage = pickStage(player.stageVote, npc.stageVote, rng);
    const common = { stage, stageVotes, playerComposition: player.composition, npcComposition: npc.composition };
    send(room.sockets.player, { type: 'MATCH_START', mySide: 'player', state: redactFor(room.state, 'player'), ...common });
    send(room.sockets.npc, { type: 'MATCH_START', mySide: 'npc', state: redactFor(room.state, 'npc'), ...common });
    scheduleNext(room);
  }

  function handleMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'CREATE_ROOM' || msg.type === 'JOIN_ROOM') {
      if (socketInfo.has(ws)) return; // one room per connection
      const setup = validateSetup(msg);
      if (!setup) {
        send(ws, { type: 'ERROR', message: 'INVALID_SETUP' });
        return;
      }

      if (msg.type === 'CREATE_ROOM') {
        if (rooms.size >= maxRooms) {
          send(ws, { type: 'ERROR', message: 'SERVER_FULL' });
          return;
        }
        const code = makeRoomCode(rooms);
        const room = { code, sockets: { player: ws, npc: null }, pending: { player: setup, npc: null }, state: null, timer: null };
        // A room nobody joins expires, so idle hosts can't hold the room cap.
        room.timer = setTimeout(() => {
          if (room.state) return;
          send(ws, { type: 'ERROR', message: 'ROOM_EXPIRED' });
          rooms.delete(code);
          socketInfo.delete(ws);
          ws.close(1000, 'room expired');
        }, waitingRoomTtlMs);
        rooms.set(code, room);
        socketInfo.set(ws, { roomCode: code, side: 'player' });
        send(ws, { type: 'ROOM_CREATED', roomCode: code, mySide: 'player' });
        return;
      }

      const room = rooms.get(String(msg.roomCode ?? '').toUpperCase());
      if (!room) {
        send(ws, { type: 'ERROR', message: 'ROOM_NOT_FOUND' });
        return;
      }
      if (room.sockets.npc) {
        send(ws, { type: 'ERROR', message: 'ROOM_FULL' });
        return;
      }
      clearRoomTimer(room); // stop the waiting-room expiry
      room.sockets.npc = ws;
      room.pending.npc = setup;
      socketInfo.set(ws, { roomCode: room.code, side: 'npc' });
      startMatch(room);
      return;
    }

    if (msg.type === 'ACTION') {
      const info = socketInfo.get(ws);
      if (!info || !msg.action || typeof msg.action !== 'object') return;
      const room = rooms.get(info.roomCode);
      if (!room || !room.state) return;
      // Clients may only send player intents; timeouts/NEXT_TURN are the
      // server's alone. The side is always taken from the socket, never
      // trusted from the payload — otherwise a player could act for the
      // opponent.
      if (!['DECLARE_SKILL', 'SELECT_CARD', 'READY'].includes(msg.action.type)) return;
      applyAction(room, { ...msg.action, side: info.side });
    }
  }

  function handleClose(ws) {
    const info = socketInfo.get(ws);
    if (!info) return;
    socketInfo.delete(ws);
    const room = rooms.get(info.roomCode);
    if (!room) return;

    // After the match is over, leaving is not a disconnect: the other player
    // keeps their result screen.
    if (room.state?.phase !== PHASES.FINISHED) send(room.sockets[otherSide(info.side)], { type: 'OPPONENT_LEFT' });
    clearRoomTimer(room);
    rooms.delete(room.code);
  }

  const wss = new WebSocketServer({
    port,
    maxPayload: MAX_PAYLOAD_BYTES,
    verifyClient: allowedOrigins.length > 0 ? ({ origin }) => allowedOrigins.includes(origin) : undefined,
  });

  wss.on('connection', (ws, req) => {
    // Behind Render's proxy the client address is the first X-Forwarded-For entry.
    const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
    const open = (connectionsPerIp.get(ip) ?? 0) + 1;
    connectionsPerIp.set(ip, open);
    ws.on('close', () => {
      const left = (connectionsPerIp.get(ip) ?? 1) - 1;
      if (left > 0) connectionsPerIp.set(ip, left);
      else connectionsPerIp.delete(ip);
    });
    if (open > maxConnectionsPerIp) {
      ws.close(1008, 'too many connections');
      return;
    }
    // A bad frame (e.g. over maxPayload) emits 'error' on the socket; without a
    // listener Node would treat it as uncaught and take the whole server down.
    // ws closes the socket itself afterwards, and 'close' cleans up the room.
    ws.on('error', () => {});

    // Simple per-connection flood guard: too many messages in one second closes it.
    let windowStart = Date.now();
    let count = 0;
    ws.on('message', (raw) => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        count = 0;
      }
      count += 1;
      if (count > maxMessagesPerSecond) {
        ws.close(1008, 'rate limit');
        return;
      }
      handleMessage(ws, raw);
    });
    ws.on('close', () => handleClose(ws));
  });

  return { wss, rooms };
}
