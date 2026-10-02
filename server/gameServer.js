// WebSocket game server for online PvP (started by server/index.js). Reuses
// the exact same pure game engine the client uses locally against the NPC, so
// the rules of a match are guaranteed identical — the server is just the
// authoritative referee that arbitrates two real players.
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { createMatch, matchReducer } from '../src/engine/reducer.js';
import {
  PHASES,
  SKILL_PHASE_SECONDS,
  CHOOSE_PHASE_SECONDS,
  ONLINE_GRACE_SECONDS,
  ONLINE_WAIT_SECONDS,
  ONLINE_MAX_PAUSES,
  otherSide,
} from '../src/engine/constants.js';
import { validateSetup, pickStage, redactFor } from './protocol.js';

const MAX_PAYLOAD_BYTES = 16 * 1024;
const SIDES = ['player', 'npc'];

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
  waitingRoomTtlMs = ONLINE_WAIT_SECONDS * 1000,
  pauseLimitMs = ONLINE_GRACE_SECONDS * 1000,
  finishedResultTtlMs = 10 * 60 * 1000,
  heartbeatMs = 15 * 1000,
  rng = Math.random,
  nextTurnDelayMs = 3000,
} = {}) {
  // roomCode -> Room
  const rooms = new Map();
  // ws -> { roomCode, side }
  const socketInfo = new WeakMap();
  // rejoin token -> { roomCode, side } (BR-ONLINE-03)
  const rejoinTokens = new Map();
  // rejoin token -> final snapshot of a match that ended and was cleaned up,
  // so a player coming back late still sees how it ended.
  const finishedSeats = new Map();
  // client ip -> open connections
  const connectionsPerIp = new Map();
  // Random matchmaking (BR-ONLINE-01): at most one player waits; the next
  // FIND_MATCH is paired with them. { ws, setup, timer } | null
  let searching = null;

  function stopSearching(ws) {
    if (searching?.ws !== ws) return;
    clearTimeout(searching.timer);
    searching = null;
  }

  function broadcastState(room) {
    for (const side of SIDES) send(room.sockets[side], { type: 'STATE', state: redactFor(room.state, side) });
  }

  function broadcast(room, message) {
    for (const side of SIDES) send(room.sockets[side], message);
  }

  function clearRoomTimer(room) {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
  }

  function deleteRoom(room) {
    clearRoomTimer(room);
    if (room.paused) clearTimeout(room.paused.timer);
    for (const side of SIDES) {
      const token = room.tokens?.[side];
      if (!token) continue;
      rejoinTokens.delete(token);
      if (room.state?.phase === PHASES.FINISHED) {
        finishedSeats.set(token, matchSnapshot(room, side));
        setTimeout(() => finishedSeats.delete(token), finishedResultTtlMs).unref?.();
      }
    }
    rooms.delete(room.code);
  }

  // Runs `action` after `ms`, remembering when, so a pause can freeze the
  // remaining time and resume it later.
  function setPhaseTimer(room, action, ms) {
    clearRoomTimer(room);
    room.phaseTimer = { action, deadline: Date.now() + ms };
    room.timer = setTimeout(() => {
      room.phaseTimer = null;
      applyAction(room, action);
    }, ms);
  }

  // The server owns the countdown for skill/choose phases and the pause before
  // the next round, instead of trusting either client to time out fairly.
  function scheduleNext(room) {
    clearRoomTimer(room);
    room.phaseTimer = null;
    if (!room.state || room.paused) return;
    if (room.state.phase === PHASES.SKILL) setPhaseTimer(room, { type: 'TIMEOUT_SKILL' }, SKILL_PHASE_SECONDS * 1000);
    else if (room.state.phase === PHASES.CHOOSE) setPhaseTimer(room, { type: 'TIMEOUT_CHOOSE' }, CHOOSE_PHASE_SECONDS * 1000);
    else if (room.state.phase === PHASES.RESOLVED) setPhaseTimer(room, { type: 'NEXT_TURN' }, nextTurnDelayMs);
  }

  function applyAction(room, action) {
    if (!room.state) return;
    const next = matchReducer(room.state, action);
    if (next === room.state) return; // reducer no-op (invalid/late action)
    room.state = next;
    broadcastState(room);
    scheduleNext(room);
  }

  // ── Pause / disconnect (BR-ONLINE-02/03) ──
  // A pause freezes the whole match for both players for at most
  // pauseLimitMs; if the side that paused (or dropped) is not back by then,
  // it forfeits. A disconnect is a forced pause that replaces a manual one.
  function pauseRoom(room, side, reason) {
    if (reason === 'pause') {
      if (room.paused || room.pausesLeft[side] <= 0) return;
      room.pausesLeft[side] -= 1;
    }
    if (room.paused) {
      if (reason !== 'disconnect') return;
      clearTimeout(room.paused.timer);
    } else if (room.phaseTimer) {
      room.resumeIn = Math.max(0, room.phaseTimer.deadline - Date.now());
      room.resumeAction = room.phaseTimer.action;
      clearRoomTimer(room);
      room.phaseTimer = null;
    }
    const timer = setTimeout(() => {
      room.paused = null;
      applyAction(room, { type: 'FORFEIT', side, cause: reason === 'pause' ? 'pauseTimeout' : 'disconnect' });
    }, pauseLimitMs);
    room.paused = { by: side, reason, until: Date.now() + pauseLimitMs, timer };
    broadcast(room, { type: 'PAUSED', by: side, reason, seconds: Math.round(pauseLimitMs / 1000), pausesLeft: room.pausesLeft[side] });
  }

  function resumeRoom(room) {
    if (!room.paused) return;
    clearTimeout(room.paused.timer);
    room.paused = null;
    if (room.resumeAction) setPhaseTimer(room, room.resumeAction, room.resumeIn);
    room.resumeAction = null;
    broadcast(room, { type: 'RESUMED', phaseMsLeft: phaseMsLeft(room) });
  }

  // A player leaves a live match on purpose: the other side wins (unless the
  // outcome was already decided — the engine keeps that result).
  function leaveMatch(room, side) {
    if (room.paused) clearTimeout(room.paused.timer);
    room.paused = null;
    room.resumeAction = null;
    applyAction(room, { type: 'FORFEIT', side, cause: 'left' });
  }

  // How long the current skill/choose phase still has, so a client that
  // (re)joins or resumes shows the server's real countdown.
  function phaseMsLeft(room) {
    if (room.paused) return room.resumeAction ? room.resumeIn : null;
    return room.phaseTimer ? Math.max(0, room.phaseTimer.deadline - Date.now()) : null;
  }

  function startMatch(room) {
    const { player, npc } = room.pending;
    room.state = createMatch({
      playerCharacter: player.character,
      playerComposition: player.composition,
      npcCharacter: npc.character,
      npcComposition: npc.composition,
    });
    room.stageVotes = { player: player.stageVote, npc: npc.stageVote };
    room.stage = pickStage(player.stageVote, npc.stageVote, rng);
    room.tokens = { player: randomUUID(), npc: randomUUID() };
    room.pausesLeft = { player: ONLINE_MAX_PAUSES, npc: ONLINE_MAX_PAUSES };
    for (const side of SIDES) {
      rejoinTokens.set(room.tokens[side], { roomCode: room.code, side });
      send(room.sockets[side], { type: 'MATCH_START', ...matchSnapshot(room, side) });
    }
    scheduleNext(room);
  }

  // Everything a client needs to (re)build its match screen.
  function matchSnapshot(room, side) {
    return {
      mySide: side,
      state: redactFor(room.state, side),
      stage: room.stage,
      stageVotes: room.stageVotes,
      playerComposition: room.pending.player.composition,
      npcComposition: room.pending.npc.composition,
      rejoinToken: room.tokens[side],
      phaseMsLeft: phaseMsLeft(room),
      pausesLeft: room.pausesLeft[side],
    };
  }

  function handleMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'FIND_MATCH') {
      if (socketInfo.has(ws) || searching?.ws === ws) return; // already in a room / queue
      const setup = validateSetup(msg);
      if (!setup) {
        send(ws, { type: 'ERROR', message: 'INVALID_SETUP' });
        return;
      }
      if (rooms.size >= maxRooms) {
        send(ws, { type: 'ERROR', message: 'SERVER_FULL' });
        return;
      }
      if (!searching) {
        const timer = setTimeout(() => {
          if (searching?.ws !== ws) return;
          searching = null;
          send(ws, { type: 'ERROR', message: 'SEARCH_EXPIRED' });
        }, waitingRoomTtlMs);
        searching = { ws, setup, timer };
        send(ws, { type: 'SEARCHING' });
        return;
      }
      // pair with the waiting player: they host (side "player"), we join
      const host = searching;
      stopSearching(host.ws);
      const code = makeRoomCode(rooms);
      const room = { code, sockets: { player: host.ws, npc: ws }, pending: { player: host.setup, npc: setup }, state: null, timer: null };
      rooms.set(code, room);
      socketInfo.set(host.ws, { roomCode: code, side: 'player' });
      socketInfo.set(ws, { roomCode: code, side: 'npc' });
      startMatch(room);
      return;
    }

    if (msg.type === 'CREATE_ROOM' || msg.type === 'JOIN_ROOM') {
      if (socketInfo.has(ws) || searching?.ws === ws) return; // one room per connection
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
      if (room.sockets.npc || room.state) {
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

    // Back into a match after a dropped connection or a closed tab.
    if (msg.type === 'REJOIN') {
      if (socketInfo.has(ws) || searching?.ws === ws) return;
      const token = String(msg.token ?? '');
      if (finishedSeats.has(token)) {
        // the match ended (and was cleaned up) while this player was away
        send(ws, { type: 'REJOINED', ...finishedSeats.get(token) });
        return;
      }
      const entry = rejoinTokens.get(token);
      const room = entry && rooms.get(entry.roomCode);
      if (!room) {
        send(ws, { type: 'ERROR', message: 'REJOIN_FAILED' });
        return;
      }
      // The token is the seat's secret: whoever holds it takes the seat back,
      // even if the server still thinks the old connection is alive (a phone
      // switching networks leaves a half-open socket for a while).
      const old = room.sockets[entry.side];
      if (old && old !== ws) {
        socketInfo.delete(old); // so its 'close' doesn't count as a disconnect
        old.terminate();
      }
      room.sockets[entry.side] = ws;
      socketInfo.set(ws, { roomCode: room.code, side: entry.side });
      send(ws, { type: 'REJOINED', ...matchSnapshot(room, entry.side) });
      if (room.paused?.by === entry.side) resumeRoom(room);
      return;
    }

    const info = socketInfo.get(ws);
    const room = info && rooms.get(info.roomCode);

    // "Cancel" in the lobby. If the pairing already happened (MATCH_START was
    // on its way), cancelling counts as leaving the match (BR-ONLINE-01).
    if (msg.type === 'CANCEL_SEARCH') {
      if (searching?.ws === ws) stopSearching(ws);
      else if (room?.state && room.state.phase !== PHASES.FINISHED) leaveMatch(room, info.side);
      return;
    }

    if (!room || !room.state || room.state.phase === PHASES.FINISHED) return;

    if (msg.type === 'PAUSE') {
      pauseRoom(room, info.side, 'pause');
      return;
    }
    if (msg.type === 'RESUME') {
      if (room.paused?.by === info.side && room.paused.reason === 'pause') resumeRoom(room);
      return;
    }

    if (msg.type === 'ACTION') {
      if (!msg.action || typeof msg.action !== 'object') return;
      // Clients may only send player intents; timeouts/NEXT_TURN are the
      // server's alone. The side is always taken from the socket, never
      // trusted from the payload — otherwise a player could act for the
      // opponent. FORFEIT = leaving the match (the other side wins).
      if (msg.action.type === 'FORFEIT') {
        leaveMatch(room, info.side);
        return;
      }
      if (room.paused) return; // the match is frozen
      if (!['DECLARE_SKILL', 'SELECT_CARD', 'READY'].includes(msg.action.type)) return;
      applyAction(room, { ...msg.action, side: info.side });
    }
  }

  function handleClose(ws) {
    stopSearching(ws); // closing the connection is how a player cancels a search
    const info = socketInfo.get(ws);
    if (!info) return;
    socketInfo.delete(ws);
    const room = rooms.get(info.roomCode);
    if (!room) return;
    if (room.sockets[info.side] === ws) room.sockets[info.side] = null;

    // Waiting room (no match yet): nothing to keep.
    if (!room.state) {
      deleteRoom(room);
      return;
    }
    // Both gone, or the match is over: the room is done once nobody is in it.
    const other = room.sockets[otherSide(info.side)];
    if (!other || room.state.phase === PHASES.FINISHED) {
      if (!other) {
        // both dropped mid-match: whoever dropped first (still on the clock) loses
        if (room.state.phase !== PHASES.FINISHED && room.paused?.reason === 'disconnect') {
          const first = room.paused.by;
          clearTimeout(room.paused.timer);
          room.paused = null;
          room.state = matchReducer(room.state, { type: 'FORFEIT', side: first, cause: 'disconnect' });
        }
        deleteRoom(room);
      }
      return;
    }
    // Mid-match drop: give them pauseLimitMs to come back (REJOIN), else forfeit.
    pauseRoom(room, info.side, 'disconnect');
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
    // heartbeat: a socket that misses a pong is dead (see the interval below)
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

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

  // Half-open connections (network switched, laptop slept) never send 'close'
  // on their own; ping every heartbeatMs and drop any that didn't answer the
  // last ping, so the disconnect grace period starts promptly.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, heartbeatMs);
  heartbeat.unref?.();
  wss.on('close', () => clearInterval(heartbeat));

  return { wss, rooms };
}
