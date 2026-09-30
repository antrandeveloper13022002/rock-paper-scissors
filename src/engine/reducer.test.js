import { describe, it, expect } from 'vitest';
import { createMatch, matchReducer } from './reducer.js';
import { PHASES, SKILL_IDS, WIN_SCORE, TOTAL_TURNS } from './constants.js';

function char(id, skillId) {
  return { id, name: { vi: id, en: id }, color: '#fff', skillId };
}

function start({ playerSkill = null, npcSkill = null, playerComposition, npcComposition } = {}) {
  return createMatch({
    playerCharacter: char('player-char', playerSkill),
    playerComposition: playerComposition ?? { keo: 3, bua: 2, bao: 2 },
    npcCharacter: char('npc-char', npcSkill),
    npcComposition: npcComposition ?? { keo: 2, bua: 3, bao: 2 },
  });
}

// Drives one full turn: optional skill declarations, then both sides pick the
// first card of the requested type from their hand (falls back to hand[0]).
function playTurn(state, { playerUse = false, npcUse = false, playerType, npcType } = {}) {
  state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: playerUse });
  state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: npcUse });

  const pickCard = (hand, type) => (type ? hand.find((c) => c.type === type) ?? hand[0] : hand[0]);
  const pCard = pickCard(state.players.player.hand, playerType);
  const nCard = pickCard(state.players.npc.hand, npcType);

  state = matchReducer(state, { type: 'SELECT_CARD', side: 'player', cardId: pCard.id });
  state = matchReducer(state, { type: 'READY', side: 'player' });
  state = matchReducer(state, { type: 'SELECT_CARD', side: 'npc', cardId: nCard.id });
  state = matchReducer(state, { type: 'READY', side: 'npc' });
  return state;
}

function advance(state) {
  return matchReducer(state, { type: 'NEXT_TURN' });
}

const ALL_KEO = { keo: 7, bua: 0, bao: 0 };
const ALL_BUA = { keo: 0, bua: 7, bao: 0 };
const ALL_BAO = { keo: 0, bua: 0, bao: 7 };

describe('basic round resolution', () => {
  it('awards 1 point to the winner and 0 to a draw', () => {
    let state = start({ playerComposition: ALL_KEO, npcComposition: ALL_BAO });
    state = playTurn(state, { playerType: 'keo', npcType: 'bao' }); // keo beats bao
    expect(state.lastRound.winnerSide).toBe('player');
    expect(state.players.player.score).toBe(1);
    expect(state.players.npc.score).toBe(0);
  });

  it('gives nobody points on a draw', () => {
    let state = start({ playerComposition: ALL_KEO, npcComposition: ALL_KEO });
    state = playTurn(state, { playerType: 'keo', npcType: 'keo' });
    expect(state.lastRound.winnerSide).toBeNull();
    expect(state.players.player.score).toBe(0);
    expect(state.players.npc.score).toBe(0);
  });
});

describe('SWAP skill', () => {
  it('judges each side using the other side chosen card, inverting the outcome', () => {
    let state = start({ playerSkill: SKILL_IDS.SWAP, playerComposition: ALL_KEO, npcComposition: ALL_BUA });
    // Player would normally lose (keo vs bua), but swap flips whose card is whose.
    state = playTurn(state, { playerUse: true, playerType: 'keo', npcType: 'bua' });
    expect(state.lastRound.winnerSide).toBe('player');
    expect(state.lastRound.playerCard.type).toBe('bua');
    expect(state.lastRound.npcCard.type).toBe('keo');
    expect(state.lastRound.swapped).toBe(true);
  });

  it('marks ordinary rounds as not swapped', () => {
    let state = start({ playerComposition: ALL_KEO, npcComposition: ALL_BUA });
    state = playTurn(state, { playerType: 'keo', npcType: 'bua' });
    expect(state.lastRound.swapped).toBe(false);
  });
});

describe('skillEvents lifecycle', () => {
  it('is cleared once the round resolves, so it cannot re-arm the UI skill-flash effect a second time', () => {
    // Regression test: the online client keys its skill-flash effect on
    // (turnNumber, phase) rather than the skillEvents array reference (which is
    // never stable across JSON-parsed server broadcasts). That only works if
    // skillEvents is actually empty by the time the round resolves — otherwise
    // the RESOLVED phase transition re-triggers the same flash/sound a second
    // time for the same skill use.
    let state = start({ playerSkill: SKILL_IDS.PEEK });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });
    expect(state.skillEvents.length).toBeGreaterThan(0);

    state = matchReducer(state, { type: 'SELECT_CARD', side: 'player', cardId: state.players.player.hand[0].id });
    state = matchReducer(state, { type: 'READY', side: 'player' });
    state = matchReducer(state, { type: 'SELECT_CARD', side: 'npc', cardId: state.players.npc.hand[0].id });
    state = matchReducer(state, { type: 'READY', side: 'npc' });

    expect(state.phase).toBe(PHASES.RESOLVED);
    expect(state.skillEvents).toEqual([]);
  });
});

describe('DOUBLE skill', () => {
  it('doubles the points earned when the user wins', () => {
    let state = start({ playerSkill: SKILL_IDS.DOUBLE, playerComposition: ALL_KEO, npcComposition: ALL_BAO });
    state = playTurn(state, { playerUse: true, playerType: 'keo', npcType: 'bao' });
    expect(state.players.player.score).toBe(2);
  });

  it('has no effect when the user does not win', () => {
    let state = start({ playerSkill: SKILL_IDS.DOUBLE, playerComposition: ALL_BAO, npcComposition: ALL_KEO });
    state = playTurn(state, { playerUse: true, playerType: 'bao', npcType: 'keo' });
    expect(state.players.player.score).toBe(0);
    expect(state.players.npc.score).toBe(1);
  });
});

describe('DENY skill', () => {
  it('zeroes the winner points when the loser used it', () => {
    let state = start({ npcSkill: SKILL_IDS.DENY, playerComposition: ALL_KEO, npcComposition: ALL_BAO });
    state = playTurn(state, { npcUse: true, playerType: 'keo', npcType: 'bao' }); // player wins
    expect(state.lastRound.winnerSide).toBe('player');
    expect(state.lastRound.pointsAwarded).toBe(0);
    expect(state.players.player.score).toBe(0);
  });
});

describe('FORCE_REDRAW skill', () => {
  it('swaps one hand card for a deck card without changing hand or total card count', () => {
    let state = start({ playerSkill: SKILL_IDS.FORCE_REDRAW });
    const npcHandBefore = state.players.npc.hand.length;
    const npcDeckBefore = state.players.npc.deckRemaining.length;

    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });

    expect(state.players.npc.hand).toHaveLength(npcHandBefore);
    expect(state.players.npc.deckRemaining).toHaveLength(npcDeckBefore);
    expect(state.skillEvents).toContainEqual({ type: SKILL_IDS.FORCE_REDRAW, by: 'player' });
  });

  it('is a no-op when the target deck is already empty', () => {
    let state = start({ playerSkill: SKILL_IDS.FORCE_REDRAW });
    // Drain npc's deck first.
    state = { ...state, players: { ...state.players, npc: { ...state.players.npc, deckRemaining: [] } } };
    const npcHandBefore = state.players.npc.hand;

    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });

    expect(state.players.npc.hand).toEqual(npcHandBefore);
    expect(state.skillEvents).toEqual([]);
  });

  it('never desyncs hand/deck sizes between both sides across a full 7-turn match', () => {
    // Regression test: an earlier bug discarded the swapped-out card instead of
    // returning it to the deck, silently draining one extra deck card and
    // leaving that player short a card (and unable to play) by turn 7.
    let state = start({ playerSkill: SKILL_IDS.FORCE_REDRAW });

    for (let turn = 1; turn <= TOTAL_TURNS; turn += 1) {
      if (state.result) break; // match already decided early (e.g. reached WIN_SCORE)
      // Fire the skill on turn 1 while npc's deck is still full, the scenario
      // that previously desynced the schedule.
      state = playTurn(state, { playerUse: turn === 1 });
      expect(state.players.player.hand.length + state.players.player.deckRemaining.length).toBe(
        state.players.npc.hand.length + state.players.npc.deckRemaining.length
      );
      if (state.phase === PHASES.RESOLVED && !state.result) state = advance(state);
    }
  });
});

describe('PEEK skill', () => {
  it('reveals exactly 2 cards (or fewer if the hand is smaller) from the opponent hand', () => {
    let state = start({ playerSkill: SKILL_IDS.PEEK });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });

    expect(state.players.player.peekInfo).toHaveLength(2);
    const npcHandIds = new Set(state.players.npc.hand.map((c) => c.id));
    state.players.player.peekInfo.forEach((c) => expect(npcHandIds.has(c.id)).toBe(true));
  });
});

describe('POINT_STEAL skill', () => {
  it('also subtracts 1 point from the loser on top of the normal award', () => {
    let state = start({
      playerSkill: SKILL_IDS.POINT_STEAL,
      playerComposition: { keo: 7, bua: 0, bao: 0 },
      npcComposition: { keo: 0, bua: 0, bao: 7 },
    });
    // Give npc 2 points first so the steal has something to subtract from.
    state = { ...state, players: { ...state.players, npc: { ...state.players.npc, score: 2 } } };
    state = playTurn(state, { playerUse: true, playerType: 'keo', npcType: 'bao' });
    expect(state.players.player.score).toBe(1);
    expect(state.players.npc.score).toBe(1);
  });

  it('never takes the loser below 0 points', () => {
    let state = start({
      playerSkill: SKILL_IDS.POINT_STEAL,
      playerComposition: { keo: 7, bua: 0, bao: 0 },
      npcComposition: { keo: 0, bua: 0, bao: 7 },
    });
    state = playTurn(state, { playerUse: true, playerType: 'keo', npcType: 'bao' });
    expect(state.players.npc.score).toBe(0);
  });

  it('does nothing when the user does not win', () => {
    let state = start({
      playerSkill: SKILL_IDS.POINT_STEAL,
      playerComposition: { keo: 0, bua: 0, bao: 7 },
      npcComposition: { keo: 7, bua: 0, bao: 0 },
    });
    state = { ...state, players: { ...state.players, npc: { ...state.players.npc, score: 2 } } };
    state = playTurn(state, { playerUse: true, playerType: 'bao', npcType: 'keo' });
    expect(state.players.npc.score).toBe(3);
  });
});

describe('CARD_LOCK skill', () => {
  it('locks one opponent card so it cannot be selected this turn', () => {
    let state = start({ playerSkill: SKILL_IDS.CARD_LOCK });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });

    const lockedId = state.players.npc.lockedCardId;
    expect(lockedId).toBeTruthy();
    expect(state.players.npc.hand.some((c) => c.id === lockedId)).toBe(true);

    const afterSelect = matchReducer(state, { type: 'SELECT_CARD', side: 'npc', cardId: lockedId });
    expect(afterSelect.players.npc.selectedCardId).toBeNull();

    const validCard = state.players.npc.hand.find((c) => c.id !== lockedId);
    const afterValidSelect = matchReducer(state, { type: 'SELECT_CARD', side: 'npc', cardId: validCard.id });
    expect(afterValidSelect.players.npc.selectedCardId).toBe(validCard.id);
  });

  it('never auto-picks the locked card on timeout', () => {
    let state = start({ playerSkill: SKILL_IDS.CARD_LOCK });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });
    const lockedId = state.players.npc.lockedCardId;

    state = matchReducer(state, { type: 'SELECT_CARD', side: 'player', cardId: state.players.player.hand[0].id });
    state = matchReducer(state, { type: 'READY', side: 'player' });
    state = matchReducer(state, { type: 'TIMEOUT_CHOOSE' });

    expect(state.players.npc.selectedCardId).not.toBe(lockedId);
  });

  it('is a no-op when the opponent has only 1 card left (must leave a legal choice)', () => {
    let state = start({ playerSkill: SKILL_IDS.CARD_LOCK });
    const onlyCard = state.players.npc.hand[0];
    state = {
      ...state,
      players: { ...state.players, npc: { ...state.players.npc, hand: [onlyCard] } },
    };

    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });

    expect(state.players.npc.lockedCardId).toBeNull();
  });
});

describe('REDRAW_ALL skill', () => {
  it('replaces the whole hand while keeping hand size and total card count unchanged', () => {
    let state = start({ playerSkill: SKILL_IDS.REDRAW_ALL });
    const before = state.players.player;
    const beforeTotal = before.hand.length + before.deckRemaining.length;
    const beforeIds = new Set([...before.hand, ...before.deckRemaining].map((c) => c.id));

    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });

    const after = state.players.player;
    expect(after.hand).toHaveLength(before.hand.length);
    expect(after.hand.length + after.deckRemaining.length).toBe(beforeTotal);
    // Every card is accounted for — none duplicated or lost in the reshuffle.
    const afterIds = [...after.hand, ...after.deckRemaining].map((c) => c.id);
    expect(new Set(afterIds)).toEqual(beforeIds);
    expect(afterIds).toHaveLength(beforeTotal);
    expect(state.skillEvents).toContainEqual({ type: SKILL_IDS.REDRAW_ALL, by: 'player' });
  });

  it('clears any stale lockedCardId from before the redraw', () => {
    let state = start({ playerSkill: SKILL_IDS.REDRAW_ALL });
    state = {
      ...state,
      players: {
        ...state.players,
        player: { ...state.players.player, lockedCardId: state.players.player.hand[0].id },
      },
    };
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: true });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });
    expect(state.players.player.lockedCardId).toBeNull();
  });

  it('never desyncs hand/deck sizes between both sides across a full 7-turn match', () => {
    let state = start({ playerSkill: SKILL_IDS.REDRAW_ALL });
    for (let turn = 1; turn <= TOTAL_TURNS; turn += 1) {
      if (state.result) break; // match already decided early (e.g. reached WIN_SCORE)
      state = playTurn(state, { playerUse: turn === 1 });
      expect(state.players.player.hand.length + state.players.player.deckRemaining.length).toBe(
        state.players.npc.hand.length + state.players.npc.deckRemaining.length
      );
      if (state.phase === PHASES.RESOLVED && !state.result) state = advance(state);
    }
  });
});

describe('winning at WIN_SCORE ends the match immediately', () => {
  it('sets result as soon as a side reaches WIN_SCORE, and NEXT_TURN moves to FINISHED', () => {
    let state = start({
      playerComposition: { keo: 7, bua: 0, bao: 0 },
      npcComposition: { keo: 0, bua: 7, bao: 0 }, // npc always wins (bua beats keo)
    });

    for (let turn = 1; turn <= WIN_SCORE; turn += 1) {
      state = playTurn(state);
      if (turn < WIN_SCORE) state = advance(state);
    }

    expect(state.result).toEqual({ winner: 'npc', reason: 'score5' });
    expect(state.phase).toBe(PHASES.RESOLVED);

    // Regression test: MatchScreen's auto-advance effect must fire NEXT_TURN even
    // when a result is already set — otherwise the UI gets stuck on this screen
    // forever instead of showing the result overlay.
    state = advance(state);
    expect(state.phase).toBe(PHASES.FINISHED);
  });
});

describe('roundsExhausted tie-break after 7 turns with nobody reaching WIN_SCORE', () => {
  it('the higher score wins', () => {
    // Player wins turns 1-2 (keo beats npc's bao), then both sides draw keo-vs-keo
    // for the remaining 5 turns — each composition carries exactly enough of each
    // type to make that sequence possible.
    let state = start({
      playerComposition: { keo: 7, bua: 0, bao: 0 },
      npcComposition: { keo: 5, bua: 0, bao: 2 },
    });
    for (let turn = 1; turn <= TOTAL_TURNS; turn += 1) {
      state = playTurn(state, { playerType: 'keo', npcType: turn <= 2 ? 'bao' : 'keo' });
      if (turn < TOTAL_TURNS) state = advance(state);
    }
    state = advance(state);
    expect(state.phase).toBe(PHASES.FINISHED);
    expect(state.result).toEqual({ winner: 'player', reason: 'roundsExhausted' });
  });

  it('is a draw when scores are tied', () => {
    let state = start({
      playerComposition: { keo: 7, bua: 0, bao: 0 },
      npcComposition: { keo: 7, bua: 0, bao: 0 },
    });
    for (let turn = 1; turn <= TOTAL_TURNS; turn += 1) {
      state = playTurn(state, { playerType: 'keo', npcType: 'keo' });
      if (turn < TOTAL_TURNS) state = advance(state);
    }
    state = advance(state);
    expect(state.result).toEqual({ winner: 'draw', reason: 'roundsExhausted' });
  });
});

describe('phase guards prevent double-resolution', () => {
  it('TIMEOUT_SKILL is a no-op outside the skill phase', () => {
    let state = start();
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: false });
    state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: false });
    expect(state.phase).toBe(PHASES.CHOOSE);
    const before = state;
    state = matchReducer(state, { type: 'TIMEOUT_SKILL' });
    expect(state).toBe(before); // unchanged reference: reducer returned early
  });

  it('TIMEOUT_CHOOSE is a no-op once the round is already resolved', () => {
    let state = start();
    state = playTurn(state); // resolves the round
    expect(state.phase).toBe(PHASES.RESOLVED);
    const before = state;
    state = matchReducer(state, { type: 'TIMEOUT_CHOOSE' });
    expect(state).toBe(before);
  });
});

describe('full match simulation never crashes', () => {
  it('runs many randomized 7-turn matches to completion without throwing', () => {
    const allSkills = Object.values(SKILL_IDS);
    for (let i = 0; i < 30; i += 1) {
      const playerSkill = allSkills[Math.floor(Math.random() * allSkills.length)];
      const npcSkill = allSkills[Math.floor(Math.random() * allSkills.length)];
      let state = start({ playerSkill, npcSkill });
      let guard = 0;

      while (state.phase !== PHASES.FINISHED && guard < 50) {
        guard += 1;
        if (state.phase === PHASES.SKILL) {
          state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'player', use: Math.random() < 0.5 });
          state = matchReducer(state, { type: 'DECLARE_SKILL', side: 'npc', use: Math.random() < 0.5 });
        } else if (state.phase === PHASES.CHOOSE) {
          const p = state.players.player;
          const n = state.players.npc;
          if (!p.ready) {
            const pick = p.hand.filter((c) => c.id !== p.lockedCardId)[0];
            state = matchReducer(state, { type: 'SELECT_CARD', side: 'player', cardId: pick.id });
            state = matchReducer(state, { type: 'READY', side: 'player' });
          }
          if (state.phase === PHASES.CHOOSE && !state.players.npc.ready) {
            const pick = n.hand.filter((c) => c.id !== n.lockedCardId)[0];
            state = matchReducer(state, { type: 'SELECT_CARD', side: 'npc', cardId: pick.id });
            state = matchReducer(state, { type: 'READY', side: 'npc' });
          }
        } else if (state.phase === PHASES.RESOLVED) {
          state = advance(state);
        }
      }

      expect(state.phase).toBe(PHASES.FINISHED);
      expect(['player', 'npc', 'draw']).toContain(state.result.winner);
    }
  });
});
