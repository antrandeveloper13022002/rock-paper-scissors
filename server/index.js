// Standalone WebSocket server for online PvP. Reuses the exact same pure game
// engine the client uses locally against the NPC, so the rules of a match are
// guaranteed identical — the server is just the authoritative referee that
// arbitrates two real players instead of a client-side AI.
import { WebSocketServer } from 'ws';
import { createMatch, matchReducer } from '../src/engine/reducer.js';
import { PHASES, SKILL_PHASE_SECONDS, CHOOSE_PHASE_SECONDS } from '../src/engine/constants.js';

const PORT = process.env.PORT || 8787;

// roomCode -> Room
const rooms = new Map();
// ws -> { roomCode, side }
const socketInfo = new WeakMap();

function makeRoomCode() {
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

function broadcastState(room) {
  send(room.sockets.player, { type: 'STATE', state: room.state });
  send(room.sockets.npc, { type: 'STATE', state: room.state });
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
    room.timer = setTimeout(() => applyAction(room, { type: 'NEXT_TURN' }), 3000);
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

function tryStartMatch(room) {
  if (!room.pending.player || !room.pending.npc) return;
  room.state = createMatch({
    playerCharacter: room.pending.player.character,
    playerComposition: room.pending.player.composition,
    npcCharacter: room.pending.npc.character,
    npcComposition: room.pending.npc.composition,
  });
  const playerComposition = room.pending.player.composition;
  const npcComposition = room.pending.npc.composition;
  send(room.sockets.player, { type: 'MATCH_START', mySide: 'player', state: room.state, playerComposition, npcComposition });
  send(room.sockets.npc, { type: 'MATCH_START', mySide: 'npc', state: room.state, playerComposition, npcComposition });
  scheduleNext(room);
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (msg.type === 'CREATE_ROOM') {
    const code = makeRoomCode();
    const room = {
      code,
      sockets: { player: ws, npc: null },
      pending: { player: { character: msg.character, composition: msg.composition }, npc: null },
      state: null,
      timer: null,
    };
    rooms.set(code, room);
    socketInfo.set(ws, { roomCode: code, side: 'player' });
    send(ws, { type: 'ROOM_CREATED', roomCode: code, mySide: 'player' });
    return;
  }

  if (msg.type === 'JOIN_ROOM') {
    const room = rooms.get((msg.roomCode || '').toUpperCase());
    if (!room) {
      send(ws, { type: 'ERROR', message: 'ROOM_NOT_FOUND' });
      return;
    }
    if (room.sockets.npc) {
      send(ws, { type: 'ERROR', message: 'ROOM_FULL' });
      return;
    }
    room.sockets.npc = ws;
    room.pending.npc = { character: msg.character, composition: msg.composition };
    socketInfo.set(ws, { roomCode: room.code, side: 'npc' });
    tryStartMatch(room);
    return;
  }

  if (msg.type === 'ACTION') {
    const info = socketInfo.get(ws);
    if (!info) return;
    const room = rooms.get(info.roomCode);
    if (!room || !room.state) return;
    // The side is always taken from the authenticated socket, never trusted
    // from the client payload — otherwise a player could dispatch actions on
    // their opponent's behalf.
    applyAction(room, { ...msg.action, side: info.side });
  }
}

function handleClose(ws) {
  const info = socketInfo.get(ws);
  if (!info) return;
  socketInfo.delete(ws);
  const room = rooms.get(info.roomCode);
  if (!room) return;

  const otherSide = info.side === 'player' ? 'npc' : 'player';
  send(room.sockets[otherSide], { type: 'OPPONENT_LEFT' });
  clearRoomTimer(room);
  rooms.delete(room.code);
}

const wss = new WebSocketServer({ port: PORT });
wss.on('connection', (ws) => {
  ws.on('message', (raw) => handleMessage(ws, raw));
  ws.on('close', () => handleClose(ws));
});

console.log(`Online match server listening on ws://localhost:${PORT}`);
