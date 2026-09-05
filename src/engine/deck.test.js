import { describe, it, expect } from 'vitest';
import { buildDeck, randomComposition, shuffle, drawOne, removeCard } from './deck.js';
import { DECK_SIZE } from './constants.js';

describe('buildDeck', () => {
  it('builds the exact composition requested, with unique ids', () => {
    const deck = buildDeck({ keo: 3, bua: 2, bao: 2 });
    expect(deck).toHaveLength(7);
    expect(deck.filter((c) => c.type === 'keo')).toHaveLength(3);
    expect(deck.filter((c) => c.type === 'bua')).toHaveLength(2);
    expect(deck.filter((c) => c.type === 'bao')).toHaveLength(2);
    expect(new Set(deck.map((c) => c.id)).size).toBe(7);
  });

  it('allows an all-one-type deck', () => {
    const deck = buildDeck({ keo: 7, bua: 0, bao: 0 });
    expect(deck.every((c) => c.type === 'keo')).toBe(true);
  });
});

describe('randomComposition', () => {
  it('always sums to DECK_SIZE', () => {
    for (let i = 0; i < 20; i += 1) {
      const comp = randomComposition();
      expect(comp.keo + comp.bua + comp.bao).toBe(DECK_SIZE);
    }
  });
});

describe('shuffle', () => {
  it('preserves all elements without mutating the input', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffle(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('drawOne', () => {
  it('draws the first card and returns the remaining deck', () => {
    const deck = [{ id: 'a' }, { id: 'b' }];
    const { card, deck: rest } = drawOne(deck);
    expect(card.id).toBe('a');
    expect(rest).toEqual([{ id: 'b' }]);
  });

  it('returns a null card for an empty deck without throwing', () => {
    const { card, deck } = drawOne([]);
    expect(card).toBeNull();
    expect(deck).toEqual([]);
  });
});

describe('removeCard', () => {
  it('removes only the matching id', () => {
    const hand = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(removeCard(hand, 'b')).toEqual([{ id: 'a' }, { id: 'c' }]);
  });
});
