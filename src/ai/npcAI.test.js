import { describe, it, expect } from 'vitest';
import { decideCard, decideSkillUse, inferLikelyOpponentType } from './npcAI.js';

describe('inferLikelyOpponentType', () => {
  it('returns null with no round history (not enough signal yet)', () => {
    expect(inferLikelyOpponentType({ keo: 5, bua: 1, bao: 1 }, [])).toBeNull();
  });

  it('picks the type the opponent has the most of remaining', () => {
    const composition = { keo: 5, bua: 1, bao: 1 };
    const log = [
      { playerCard: { type: 'keo' } },
      { playerCard: { type: 'bua' } },
    ];
    // remaining: keo=4, bua=0, bao=1 -> keo is by far the most likely.
    expect(inferLikelyOpponentType(composition, log)).toBe('keo');
  });

  it('returns null once nothing remains to infer (all zero)', () => {
    const composition = { keo: 1, bua: 0, bao: 0 };
    const log = [{ playerCard: { type: 'keo' } }];
    expect(inferLikelyOpponentType(composition, log)).toBeNull();
  });
});

describe('decideCard', () => {
  it('prefers the peeked counter over the statistical one when both are known', () => {
    const npc = {
      hand: [{ id: 'a', type: 'keo' }, { id: 'b', type: 'bua' }, { id: 'c', type: 'bao' }],
      peekInfo: [{ type: 'bua' }], // opponent has bua -> counter is bao
    };
    // Statistical signal would point elsewhere, but peek should win.
    const cardId = decideCard(npc, {
      opponentComposition: { keo: 5, bua: 1, bao: 1 },
      log: [{ playerCard: { type: 'bao' } }],
    });
    expect(cardId).toBe('c'); // bao beats bua
  });

  it('falls back to the statistical counter when there is no peek info', () => {
    const npc = {
      hand: [{ id: 'a', type: 'keo' }, { id: 'b', type: 'bua' }, { id: 'c', type: 'bao' }],
      peekInfo: null,
    };
    // opponent composition all keo remaining -> counter is bua
    const cardId = decideCard(npc, {
      opponentComposition: { keo: 5, bua: 0, bao: 0 },
      log: [{ playerCard: { type: 'keo' } }],
    });
    expect(cardId).toBe('b'); // bua beats keo
  });

  it('falls back to a random hand card when there is no signal at all (turn 1)', () => {
    const npc = { hand: [{ id: 'a', type: 'keo' }], peekInfo: null };
    const cardId = decideCard(npc, { opponentComposition: { keo: 5, bua: 1, bao: 1 }, log: [] });
    expect(cardId).toBe('a');
  });

  it('returns null when the hand is empty', () => {
    const npc = { hand: [], peekInfo: null };
    expect(decideCard(npc, { opponentComposition: {}, log: [] })).toBeNull();
  });
});

describe('difficulty tiers', () => {
  it('easy ignores all signals and always picks randomly from hand', () => {
    const npc = {
      hand: [{ id: 'a', type: 'keo' }, { id: 'b', type: 'bua' }],
      peekInfo: [{ type: 'bua' }], // would otherwise force the 'bao' counter
    };
    for (let i = 0; i < 20; i += 1) {
      const cardId = decideCard(npc, {
        opponentComposition: { keo: 5, bua: 0, bao: 0 },
        log: [{ playerCard: { type: 'keo' } }],
        difficulty: 'easy',
      });
      expect(['a', 'b']).toContain(cardId);
    }
  });

  it('hard settles for a safe draw over a blind gamble when it cannot counter', () => {
    // Hand has no 'bua' (the exact counter to the likely 'keo'), but does have
    // a 'keo' of its own, which would at least force a draw instead of a coin flip.
    const npc = {
      hand: [{ id: 'a', type: 'keo' }, { id: 'b', type: 'bao' }],
      peekInfo: null,
    };
    const cardId = decideCard(npc, {
      opponentComposition: { keo: 5, bua: 0, bao: 0 },
      log: [{ playerCard: { type: 'keo' } }],
      difficulty: 'hard',
    });
    expect(cardId).toBe('a');
  });

  it('normal does not take the hard safe-draw fallback (goes fully random instead)', () => {
    const npc = {
      hand: [{ id: 'a', type: 'keo' }, { id: 'b', type: 'bao' }],
      peekInfo: null,
    };
    for (let i = 0; i < 20; i += 1) {
      const cardId = decideCard(npc, {
        opponentComposition: { keo: 5, bua: 0, bao: 0 },
        log: [{ playerCard: { type: 'keo' } }],
        difficulty: 'normal',
      });
      expect(['a', 'b']).toContain(cardId);
    }
  });

  it('skill-use chance ranks hard > normal > easy when behind on score', () => {
    const npc = { skillUsed: false, score: 0 };
    const player = { score: 3 };
    const samples = (difficulty) =>
      Array.from({ length: 400 }, () => decideSkillUse(npc, player, difficulty)).filter(Boolean).length;

    const easy = samples('easy');
    const normal = samples('normal');
    const hard = samples('hard');

    expect(easy).toBeLessThan(normal);
    expect(normal).toBeLessThan(hard);
  });
});
