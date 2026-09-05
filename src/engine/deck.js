import { CARD_TYPES, DECK_SIZE } from './constants.js';

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `card-${idCounter}`;
}

// composition: { keo: n, bua: n, bao: n }, sum must equal DECK_SIZE
export function buildDeck(composition) {
  const cards = [];
  for (const type of CARD_TYPES) {
    const count = composition[type] ?? 0;
    for (let i = 0; i < count; i += 1) {
      cards.push({ id: nextId(), type });
    }
  }
  return cards;
}

export function randomComposition(total = DECK_SIZE) {
  const composition = { keo: 0, bua: 0, bao: 0 };
  for (let i = 0; i < total; i += 1) {
    const type = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
    composition[type] += 1;
  }
  return composition;
}

export function shuffle(cards) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawOne(deck) {
  if (deck.length === 0) return { card: null, deck };
  const [card, ...rest] = deck;
  return { card, deck: rest };
}

export function removeCard(cards, cardId) {
  return cards.filter((c) => c.id !== cardId);
}
