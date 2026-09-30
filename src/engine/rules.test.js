import { describe, it, expect } from 'vitest';
import { resolveRound, spentCounts } from './rules.js';

describe('resolveRound', () => {
  it('keo beats bao', () => {
    expect(resolveRound('keo', 'bao')).toBe('a');
    expect(resolveRound('bao', 'keo')).toBe('b');
  });

  it('bua beats keo', () => {
    expect(resolveRound('bua', 'keo')).toBe('a');
    expect(resolveRound('keo', 'bua')).toBe('b');
  });

  it('bao beats bua', () => {
    expect(resolveRound('bao', 'bua')).toBe('a');
    expect(resolveRound('bua', 'bao')).toBe('b');
  });

  it('same type is a draw', () => {
    expect(resolveRound('keo', 'keo')).toBe('draw');
    expect(resolveRound('bua', 'bua')).toBe('draw');
    expect(resolveRound('bao', 'bao')).toBe('draw');
  });
});

describe('spentCounts', () => {
  const round = (p, n, swapped = false) => ({ playerCard: { type: p }, npcCard: { type: n }, swapped });
  it("counts each side's own played cards", () => {
    const log = [round('bao', 'keo'), round('bao', 'bua')];
    expect(spentCounts(log, 'player')).toEqual({ keo: 0, bua: 0, bao: 2 });
    expect(spentCounts(log, 'npc')).toEqual({ keo: 1, bua: 1, bao: 0 });
  });
  it('credits the physical card after a Fate Swap', () => {
    const log = [round('bua', 'keo', true)]; // player really spent keo, npc spent bua
    expect(spentCounts(log, 'player')).toEqual({ keo: 1, bua: 0, bao: 0 });
    expect(spentCounts(log, 'npc')).toEqual({ keo: 0, bua: 1, bao: 0 });
  });
});
