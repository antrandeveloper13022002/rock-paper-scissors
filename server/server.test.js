import { describe, it, expect, afterEach } from 'vitest';
import WebSocket from 'ws';
import { createGameServer } from './gameServer.js';
import { validateSetup, pickStage, redactFor } from './protocol.js';
import { createMatch } from '../src/engine/reducer.js';
import { CHARACTERS } from '../src/data/characters.js';

const COMP = { keo: 3, bua: 2, bao: 2 };

describe('validateSetup', () => {
  it('accepts a valid setup and uses the server copy of the character', () => {
    const setup = validateSetup({ characterId: 'loi-long', composition: COMP, stageVote: 'am-anh' });
    expect(setup.character).toBe(CHARACTERS.find((c) => c.id === 'loi-long'));
    expect(setup.stageVote).toBe('am-anh');
  });

  it('accepts the { character } payload older cached clients send', () => {
    expect(validateSetup({ character: { id: 'am-anh', skillId: 'hacked' }, composition: COMP }).character).toBe(
      CHARACTERS.find((c) => c.id === 'am-anh')
    );
  });

  it('rejects unknown characters, bad decks and unknown stages', () => {
    expect(validateSetup({ characterId: 'nope', composition: COMP })).toBeNull();
    expect(validateSetup({ characterId: 'loi-long', composition: { keo: 7, bua: 1, bao: 0 } })).toBeNull();
    expect(validateSetup({ characterId: 'loi-long', composition: { keo: 8, bua: -1, bao: 0 } })).toBeNull();
    expect(validateSetup({ characterId: 'loi-long', composition: { keo: 2.5, bua: 2.5, bao: 2 } })).toBeNull();
    expect(validateSetup({ characterId: 'loi-long', composition: COMP, stageVote: '__proto__' })).toBeNull();
  });
});

describe('pickStage', () => {
  it('uses the shared vote when both agree', () => {
    expect(pickStage('am-anh', 'am-anh', () => 0.99)).toBe('am-anh');
  });
  it('picks one of the two votes when they differ', () => {
    expect(pickStage('am-anh', 'phap-su', () => 0.1)).toBe('am-anh');
    expect(pickStage('am-anh', 'phap-su', () => 0.9)).toBe('phap-su');
  });
});

describe('redactFor', () => {
  it("hides which of the opponent's cards is locked", () => {
    const state = createMatch({ playerCharacter: CHARACTERS[0], playerComposition: COMP, npcCharacter: CHARACTERS[1], npcComposition: COMP });
    state.players.npc.lockedCardId = state.players.npc.hand[0].id;
    expect(redactFor(state, 'player').players.npc.lockedCardId).toBeNull();
    expect(redactFor(state, 'npc').players.npc.lockedCardId).toBe(state.players.npc.hand[0].id);
  });

  it("hides the opponent's hand and both draw piles but keeps the counts", () => {
    const state = createMatch({
      playerCharacter: CHARACTERS[0],
      playerComposition: COMP,
      npcCharacter: CHARACTERS[1],
      npcComposition: COMP,
    });
    const view = redactFor(state, 'player');
    expect(view.players.player.hand).toEqual(state.players.player.hand);
    expect(view.players.npc.hand.every((c) => c.type === null)).toBe(true);
    expect(view.players.npc.hand).toHaveLength(state.players.npc.hand.length);
    expect(view.players.npc.deckRemaining.every((c) => c.type === null)).toBe(true);
    expect(view.players.player.deckRemaining).toHaveLength(state.players.player.deckRemaining.length);
  });
});

describe('game server', () => {
  let server;
  const clients = [];

  afterEach(async () => {
    clients.forEach((c) => c.close());
    clients.length = 0;
    await new Promise((resolve) => server.wss.close(resolve));
  });

  const start = (opts) => {
    server = createGameServer({ port: 0, ...opts });
    return new Promise((resolve) => server.wss.on('listening', resolve));
  };

  // Client that queues messages so tests can await them in order.
  const connect = () =>
    new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${server.wss.address().port}`);
      const queue = [];
      const waiters = [];
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        const w = waiters.shift();
        if (w) w(msg);
        else queue.push(msg);
      });
      ws.next = () => new Promise((res) => (queue.length ? res(queue.shift()) : waiters.push(res)));
      // Resolves 'none' if nothing arrives within `ms`, without leaving a stale waiter.
      ws.nextWithin = (ms) =>
        new Promise((res) => {
          if (queue.length) return res(queue.shift());
          const waiter = (msg) => {
            clearTimeout(timer);
            res(msg);
          };
          const timer = setTimeout(() => {
            waiters.splice(waiters.indexOf(waiter), 1);
            res('none');
          }, ms);
          waiters.push(waiter);
        });
      ws.json = (m) => ws.send(JSON.stringify(m));
      clients.push(ws);
      ws.on('open', () => resolve(ws));
    });

  const pair = async (voteA = 'am-anh', voteB = 'phap-su') => {
    const a = await connect();
    a.json({ type: 'CREATE_ROOM', characterId: 'loi-long', composition: COMP, stageVote: voteA });
    const created = await a.next();
    const b = await connect();
    b.json({ type: 'JOIN_ROOM', roomCode: created.roomCode, characterId: 'huyet-vu', composition: COMP, stageVote: voteB });
    return { a, b, created, startA: await a.next(), startB: await b.next() };
  };

  it('starts a match on one of the two voted stages, same for both players', async () => {
    await start({ rng: () => 0.9 });
    const { startA, startB } = await pair();
    expect(startA.type).toBe('MATCH_START');
    expect(startA.stage).toBe('phap-su');
    expect(startB.stage).toBe('phap-su');
    expect(startA.stageVotes).toEqual({ player: 'am-anh', npc: 'phap-su' });
    expect(startA.state.players.npc.hand.every((c) => c.type === null)).toBe(true);
    expect(startB.state.players.player.hand.every((c) => c.type === null)).toBe(true);
  });

  it('rejects an invalid setup', async () => {
    await start();
    const a = await connect();
    a.json({ type: 'CREATE_ROOM', characterId: 'loi-long', composition: { keo: 7, bua: 7, bao: 7 } });
    expect(await a.next()).toEqual({ type: 'ERROR', message: 'INVALID_SETUP' });
  });

  it('rejects a third player and caps the number of rooms', async () => {
    await start({ maxRooms: 1 });
    const { created } = await pair();
    const c = await connect();
    c.json({ type: 'JOIN_ROOM', roomCode: created.roomCode, characterId: 'am-anh', composition: COMP });
    expect((await c.next()).message).toBe('ROOM_FULL');
    c.json({ type: 'CREATE_ROOM', characterId: 'am-anh', composition: COMP });
    expect((await c.next()).message).toBe('SERVER_FULL');
  });

  const closed = (ws) => new Promise((resolve) => ws.on('close', (code) => resolve(code)));

  it('survives an oversized frame instead of crashing', async () => {
    await start();
    const a = await connect();
    a.send('x'.repeat(20 * 1024));
    expect(await closed(a)).toBe(1009); // message too big
    const b = await connect();
    b.json({ type: 'CREATE_ROOM', characterId: 'loi-long', composition: COMP });
    expect((await b.next()).type).toBe('ROOM_CREATED');
  });

  it('limits open connections per client address', async () => {
    await start({ maxConnectionsPerIp: 2 });
    await connect();
    await connect();
    const third = await connect();
    expect(await closed(third)).toBe(1008);
  });

  it('expires a room nobody joins', async () => {
    await start({ waitingRoomTtlMs: 100 });
    const a = await connect();
    a.json({ type: 'CREATE_ROOM', characterId: 'loi-long', composition: COMP });
    const { roomCode } = await a.next();
    expect(await a.next()).toEqual({ type: 'ERROR', message: 'ROOM_EXPIRED' });
    const b = await connect();
    b.json({ type: 'JOIN_ROOM', roomCode, characterId: 'am-anh', composition: COMP });
    expect((await b.next()).message).toBe('ROOM_NOT_FOUND');
  });

  it('does not report a disconnect once the match is over', async () => {
    await start();
    const { a, b, created } = await pair();
    const room = server.rooms.get(created.roomCode);
    room.state = { ...room.state, phase: 'finished' };
    a.close();
    expect(await b.nextWithin(300)).toBe('none');
  });

  it('acts for the sender only and ignores client-sent timeouts', async () => {
    await start();
    const { a, b } = await pair();
    // a is side "player" but claims to act for "npc"
    a.json({ type: 'ACTION', action: { type: 'DECLARE_SKILL', side: 'npc', use: false } });
    const stateA = (await a.next()).state;
    await b.next();
    expect(stateA.players.player.skillDeclaredThisTurn).toBe(false);
    // clients may not force a phase timeout: nothing is broadcast
    b.json({ type: 'ACTION', action: { type: 'TIMEOUT_SKILL' } });
    const silent = await a.nextWithin(200);
    expect(silent).toBe('none');
    b.json({ type: 'ACTION', action: { type: 'DECLARE_SKILL', use: false } });
    const next = (await a.next()).state;
    expect(next.phase).toBe('choose');
  });
});
